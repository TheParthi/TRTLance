import { getAddress, type Log } from 'ethers';
import { weiToAmount, toWei } from '@/lib/money';
import type { Contract, EscrowTransaction, Milestone } from '@/lib/types';
import { escrowInterface, escrowKey, escrowRef } from './escrow';

export interface ReceiptLike {
  status: number | null;
  to: string | null;
  from: string;
  blockNumber: number;
  confirmations: number;
  logs: readonly Pick<Log, 'address' | 'topics' | 'data'>[];
}

export type Decision =
  | { action: 'wait'; reason: string }
  | { action: 'fail'; reason: string }
  | { action: 'apply'; rpc: string; args: Record<string, unknown> };

export interface VerifyContext {
  tx: Pick<EscrowTransaction, 'id' | 'kind' | 'milestone_id'>;
  contract: Pick<Contract, 'id' | 'client_wallet' | 'freelancer_wallet' | 'escrow_key' | 'total_amount'>;
  milestones: Pick<Milestone, 'id' | 'position' | 'amount'>[];
  escrowAddress: string;
  requiredConfirmations: number;
}

const lower = (a: string | null | undefined) => (a ?? '').toLowerCase();

/**
 * Decides what a transaction receipt proves about a TrustLance contract. Pure: no network access,
 * so every rule is unit-tested. The database re-checks amounts and states when the result is applied.
 */
export function interpretReceipt(receipt: ReceiptLike | null, ctx: VerifyContext): Decision {
  if (!receipt) return { action: 'wait', reason: 'Waiting for the transaction to be mined.' };
  if (receipt.status !== 1) return { action: 'fail', reason: 'The transaction reverted on-chain. No funds moved.' };
  if (lower(receipt.to) !== lower(ctx.escrowAddress)) {
    return { action: 'fail', reason: 'This transaction was not sent to the TrustLance escrow contract.' };
  }
  if (receipt.confirmations < ctx.requiredConfirmations) {
    return { action: 'wait', reason: `Waiting for ${ctx.requiredConfirmations} confirmations.` };
  }

  const parsed = receipt.logs
    .filter((l) => lower(l.address) === lower(ctx.escrowAddress))
    .map((l) => {
      try {
        return escrowInterface.parseLog({ topics: [...l.topics], data: l.data });
      } catch {
        return null;
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const expected = { fund: 'Funded', release: 'Released', refund: 'Refunded', dispute: 'DisputeRaised', resolve: 'DisputeResolved' }[ctx.tx.kind];
  const event = parsed.find((p) => p.name === expected);
  if (!event) return { action: 'fail', reason: 'The transaction did not perform the expected escrow action.' };

  const base = { p_tx_id: ctx.tx.id, p_block: receipt.blockNumber, p_from: lower(receipt.from) };

  if (ctx.tx.kind === 'fund') {
    if (!ctx.contract.client_wallet || !ctx.contract.freelancer_wallet) {
      return { action: 'fail', reason: 'Both parties must sign with verified wallets before funding.' };
    }
    const ref = escrowRef(ctx.contract.id);
    const key = escrowKey(getAddress(ctx.contract.client_wallet), ref);
    const [eKey, eRef, eClient, eFreelancer, eTotal, eAmounts] = event.args as unknown as [string, string, string, string, bigint, bigint[]];
    if (lower(eKey) !== key || lower(eRef) !== ref) return { action: 'fail', reason: 'The deposit was made for a different contract reference.' };
    if (lower(eClient) !== lower(ctx.contract.client_wallet)) return { action: 'fail', reason: 'Escrow was funded from a wallet other than the client’s verified wallet.' };
    if (lower(eFreelancer) !== lower(ctx.contract.freelancer_wallet)) return { action: 'fail', reason: 'The deposit names a different freelancer wallet.' };
    const ordered = [...ctx.milestones].sort((a, b) => a.position - b.position);
    if (eAmounts.length !== ordered.length || eAmounts.some((a, i) => a !== toWei(ordered[i].amount))) {
      return { action: 'fail', reason: 'The deposited milestone amounts do not match the contract.' };
    }
    if (eTotal !== toWei(ctx.contract.total_amount)) return { action: 'fail', reason: 'The deposited total does not match the contract.' };
    return {
      action: 'apply',
      rpc: 'apply_escrow_funding',
      args: { ...base, p_amount: weiToAmount(eTotal), p_escrow_address: lower(ctx.escrowAddress), p_escrow_key: key },
    };
  }

  // Every other action must target this contract's agreement.
  const eventKey = lower(event.args[0] as string);
  if (!ctx.contract.escrow_key || eventKey !== lower(ctx.contract.escrow_key)) {
    return { action: 'fail', reason: 'The transaction targets a different escrow agreement.' };
  }
  const index = Number(event.args[1] as bigint);
  const position = index + 1;
  const milestone = ctx.milestones.find((m) => m.position === position);
  if (!milestone) return { action: 'fail', reason: 'The transaction targets a milestone that does not exist.' };
  if (ctx.tx.milestone_id && ctx.tx.milestone_id !== milestone.id) {
    return { action: 'fail', reason: 'The transaction targets a different milestone than the one you chose.' };
  }

  switch (ctx.tx.kind) {
    case 'release': {
      const [, , to, amount] = event.args as unknown as [string, bigint, string, bigint];
      if (lower(to) !== lower(ctx.contract.freelancer_wallet)) return { action: 'fail', reason: 'Funds were released to an unexpected wallet.' };
      return { action: 'apply', rpc: 'apply_escrow_release', args: { ...base, p_position: position, p_amount: weiToAmount(amount) } };
    }
    case 'refund': {
      const [, , to, amount] = event.args as unknown as [string, bigint, string, bigint];
      if (lower(to) !== lower(ctx.contract.client_wallet)) return { action: 'fail', reason: 'Funds were refunded to an unexpected wallet.' };
      return { action: 'apply', rpc: 'apply_escrow_refund', args: { ...base, p_position: position, p_amount: weiToAmount(amount) } };
    }
    case 'dispute':
      return { action: 'apply', rpc: 'apply_escrow_dispute_flag', args: { ...base, p_position: position } };
    case 'resolve': {
      const [, , , freelancerAmount, clientAmount] = event.args as unknown as [string, bigint, number, bigint, bigint];
      return {
        action: 'apply',
        rpc: 'apply_escrow_resolution',
        args: { ...base, p_position: position, p_freelancer_amount: weiToAmount(freelancerAmount), p_client_amount: weiToAmount(clientAmount) },
      };
    }
    default:
      return { action: 'fail', reason: 'Unknown transaction type.' };
  }
}
