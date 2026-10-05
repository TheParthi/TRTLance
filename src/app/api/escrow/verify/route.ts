import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { verifyEscrowTransaction } from '@/lib/chain/server';
import { jsonError, rateLimit } from '@/lib/api';

const Body = z.object({ txId: z.string().uuid() });

/** Verifies a reported escrow transaction on-chain. Any party to the contract may trigger it. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError(401, 'not_authenticated', 'Sign in to continue.');
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'validation', 'Invalid request.');

  // Row-level security decides whether this user may see the transaction at all.
  const { data: tx } = await supabase.from('escrow_transactions').select('id').eq('id', parsed.data.txId).maybeSingle();
  if (!tx) return jsonError(404, 'not_found', 'Transaction not found.');

  const limited = await rateLimit('escrow_verify', auth.user.id, 60, 60);
  if (limited) return limited;
  try {
    return NextResponse.json(await verifyEscrowTransaction(tx.id));
  } catch (error) {
    console.error('[escrow verify]', error);
    return NextResponse.json({ status: 'pending', reason: 'The network could not be reached. We will keep checking.' });
  }
}
