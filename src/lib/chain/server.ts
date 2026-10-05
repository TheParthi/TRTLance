import 'server-only';
import { JsonRpcProvider } from 'ethers';
import { publicEnv, isEscrowConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Contract, EscrowTransaction, Milestone } from '@/lib/types';
import { interpretReceipt } from './verify';

const DROP_AFTER_MS = 30 * 60 * 1000;

function provider() {
  const url = process.env.ESCROW_RPC_URL || publicEnv.chain.rpcUrl;
  return new JsonRpcProvider(url, publicEnv.chain.id, { staticNetwork: true });
}

export type VerifyOutcome = { status: 'pending' | 'confirmed' | 'failed'; reason?: string };

/**
 * Checks a reported escrow transaction against the chain and, when it is final, records the
 * verified effect through the service-only database functions. Safe to call repeatedly.
 */
export async function verifyEscrowTransaction(txId: string): Promise<VerifyOutcome> {
  const admin = createAdminClient();
  const { data: tx } = await admin.from('escrow_transactions').select('*').eq('id', txId).single<EscrowTransaction>();
  if (!tx) return { status: 'failed', reason: 'Transaction not found.' };
  if (tx.status !== 'pending') return { status: tx.status, reason: tx.failure_reason ?? undefined };

  const fail = async (reason: string): Promise<VerifyOutcome> => {
    await admin.rpc('fail_escrow_tx', { p_tx_id: tx.id, p_reason: reason });
    return { status: 'failed', reason };
  };

  if (!isEscrowConfigured()) return { status: 'pending', reason: 'Escrow verification is not configured on this server.' };
  if (tx.chain_id !== publicEnv.chain.id) return fail(`This transaction was sent on chain ${tx.chain_id}, not ${publicEnv.chain.name || publicEnv.chain.id}.`);

  const [{ data: contract }, { data: milestones }] = await Promise.all([
    admin.from('contracts').select('*').eq('id', tx.contract_id).single<Contract>(),
    admin.from('milestones').select('id, position, amount').eq('contract_id', tx.contract_id).returns<Milestone[]>(),
  ]);
  if (!contract || !milestones) return { status: 'pending', reason: 'Contract data is temporarily unavailable.' };

  const rpc = provider();
  const receipt = await rpc.getTransactionReceipt(tx.tx_hash);
  if (!receipt) {
    const pendingTx = await rpc.getTransaction(tx.tx_hash);
    if (!pendingTx && Date.now() - new Date(tx.created_at).getTime() > DROP_AFTER_MS) {
      return fail('The network has no record of this transaction. It was probably dropped or replaced.');
    }
    return { status: 'pending', reason: 'Waiting for the transaction to be mined.' };
  }

  const decision = interpretReceipt(
    {
      status: receipt.status,
      to: receipt.to,
      from: receipt.from,
      blockNumber: receipt.blockNumber,
      confirmations: await receipt.confirmations(),
      logs: receipt.logs,
    },
    {
      tx,
      contract,
      milestones,
      escrowAddress: publicEnv.chain.escrowAddress,
      requiredConfirmations: Number(process.env.ESCROW_CONFIRMATIONS ?? 1),
    },
  );

  if (decision.action === 'wait') return { status: 'pending', reason: decision.reason };
  if (decision.action === 'fail') return fail(decision.reason);

  const { error } = await admin.rpc(decision.rpc, decision.args);
  if (error) {
    console.error('[escrow] apply failed', decision.rpc, error);
    return { status: 'pending', reason: 'Confirmed on-chain; recording it failed and will be retried.' };
  }
  const { data: after } = await admin.from('escrow_transactions').select('status, failure_reason').eq('id', tx.id).single();
  return { status: after?.status ?? 'pending', reason: after?.failure_reason ?? undefined };
}
