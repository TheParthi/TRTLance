/**
 * Public configuration. Next.js inlines NEXT_PUBLIC_* values at build time, so each one is
 * referenced explicitly.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
  /** Razorpay key id for the checkout widget. Empty = test payments (no real money). */
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
};

/** The unit every amount is shown in. 1 coin = ₹1. */
export const CURRENCY = 'coins';
export const COIN_NAME = 'TrustLance Coins';

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/**
 * Which Supabase values are missing, for pages that would otherwise fail several frames deep inside
 * the client library with a message about an API key. Returns an empty array when all are present.
 */
export function missingSupabaseConfig() {
  return [
    ['NEXT_PUBLIC_SUPABASE_URL', publicEnv.supabaseUrl],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', publicEnv.supabaseAnonKey],
  ].filter(([, value]) => !value).map(([key]) => key);
}
