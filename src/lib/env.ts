/**
 * Public configuration. Next.js inlines NEXT_PUBLIC_* values at build time, so each one is
 * referenced explicitly. Escrow settings are optional: without them the app says plainly
 * that on-chain escrow is not configured instead of pretending.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
  chain: {
    id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 0),
    name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? '',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? '',
    explorerUrl: (process.env.NEXT_PUBLIC_EXPLORER_URL ?? '').replace(/\/$/, ''),
    symbol: process.env.NEXT_PUBLIC_NATIVE_SYMBOL ?? 'SHM',
    escrowAddress: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? '').toLowerCase(),
  },
};

export const CURRENCY = 'SHM';

export function isEscrowConfigured() {
  const c = publicEnv.chain;
  return Boolean(c.id && c.rpcUrl && /^0x[0-9a-f]{40}$/.test(c.escrowAddress));
}

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}
