import { NextResponse } from 'next/server';
import { verifyMessage } from 'ethers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseSiweMessage } from '@/lib/chain/siwe';
import { publicEnv } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { jsonError, rateLimit } from '@/lib/api';

const Body = z.object({ message: z.string().min(50).max(2000), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) });

/** Completes Sign-In-With-Ethereum: proves the user controls the wallet, then binds it permanently. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError(401, 'not_authenticated', 'Sign in to continue.');
  const limited = await rateLimit('wallet_verify', auth.user.id, 10, 600);
  if (limited) return limited;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'validation', 'Invalid signature request.');
  const fields = parseSiweMessage(parsed.data.message);
  if (!fields) return jsonError(400, 'validation', 'The signed message is not a TrustLance verification message.');

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (fields.domain !== host) return jsonError(400, 'domain_mismatch', 'The message was created for a different website.');
  if (publicEnv.chain.id && fields.chainId !== publicEnv.chain.id) {
    return jsonError(400, 'wrong_network', `Switch your wallet to ${publicEnv.chain.name || `chain ${publicEnv.chain.id}`} and try again.`);
  }
  const issued = Date.parse(fields.issuedAt);
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 10 * 60 * 1000) {
    return jsonError(400, 'expired', 'This verification request expired. Start again.');
  }

  let recovered: string;
  try {
    recovered = verifyMessage(parsed.data.message, parsed.data.signature);
  } catch {
    return jsonError(400, 'bad_signature', 'The signature could not be verified.');
  }
  if (recovered.toLowerCase() !== fields.address.toLowerCase()) {
    return jsonError(400, 'bad_signature', 'The signature does not belong to this wallet.');
  }

  const { error } = await createAdminClient().rpc('link_verified_wallet', {
    p_user: auth.user.id,
    p_nonce: fields.nonce,
    p_address: fields.address,
    p_chain_id: fields.chainId,
    p_message: parsed.data.message,
    p_signature: parsed.data.signature,
  });
  if (error) {
    const e = toAppError(error);
    return jsonError(e.code === 'unexpected' ? 500 : 409, e.code, e.message);
  }
  return NextResponse.json({ address: fields.address.toLowerCase() });
}
