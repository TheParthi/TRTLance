'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';
import { publicEnv } from '@/lib/env';
import type { EscrowTxKind } from '@/lib/types';

/** Records a transaction the user's wallet just broadcast. It stays "pending" until verified on-chain. */
export async function reportEscrowTx(input: {
  contractId: string;
  kind: EscrowTxKind;
  milestoneId: string | null;
  txHash: string;
}): Promise<ActionResult<string>> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) return fail('validation', 'Invalid transaction hash.');
  if (!publicEnv.chain.id) return fail('escrow_unavailable', 'Escrow is not configured.');
  return attempt(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('report_escrow_tx', {
      p_contract_id: input.contractId,
      p_kind: input.kind,
      p_milestone_id: input.milestoneId,
      p_chain_id: publicEnv.chain.id,
      p_tx_hash: input.txHash.toLowerCase(),
    });
    if (error) throw error;
    revalidatePath(`/contracts/${input.contractId}`);
    return data as string;
  });
}
