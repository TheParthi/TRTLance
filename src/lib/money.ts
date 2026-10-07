import { CURRENCY } from '@/lib/env';

/**
 * Money helpers. Every amount is a whole number of TrustLance Coins (1 coin = ₹1). Postgres numerics
 * arrive as strings such as "1500.000000000000000000"; arithmetic uses bigint, never floating point.
 */
const COINS_RE = /^\d{1,15}$/;

/** Parses user input like "1,250" into coins, or null if it is not a whole, non-negative number. */
export function parseAmount(input: string | number | null | undefined): bigint | null {
  if (input === null || input === undefined) return null;
  const clean = String(input).trim().replace(/[,\s]/g, '');
  return COINS_RE.test(clean) ? BigInt(clean) : null;
}

/** "1500.000000000000000000" → "1500". Any fraction (only possible on legacy rows) is dropped. */
export function normalizeAmount(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const whole = String(value).split('.')[0].replace(/^(-?)0+(?=\d)/, '$1');
  return whole === '' || whole === '-' ? '0' : whole;
}

export function toCoins(value: string | number | bigint | null | undefined): bigint {
  return typeof value === 'bigint' ? value : BigInt(normalizeAmount(value));
}

export function coinsToString(coins: bigint): string {
  return coins.toString();
}

function groupThousands(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Human display: "1,234 coins". */
export function formatAmount(value: string | number | bigint | null | undefined, opts: { symbol?: boolean } = {}) {
  const normalized = normalizeAmount(value);
  const negative = normalized.startsWith('-');
  const text = `${negative ? '-' : ''}${groupThousands(negative ? normalized.slice(1) : normalized)}`;
  return opts.symbol === false ? text : `${text} ${CURRENCY}`;
}

/** Rupees from paise: 150000 → "₹1,500", 150050 → "₹1,500.50". */
export function formatRupees(paise: string | number | bigint) {
  const p = toCoins(paise);
  const rupees = groupThousands((p / 100n).toString());
  const rest = p % 100n;
  return `₹${rupees}${rest ? `.${rest.toString().padStart(2, '0')}` : ''}`;
}

export function sumAmounts(values: (string | number | bigint)[]): string {
  return values.reduce<bigint>((total, v) => total + toCoins(v), 0n).toString();
}

/** Splits a disputed milestone like the database does: the freelancer's share rounds down. */
export function splitByPct(amount: string | number, freelancerPct: number) {
  const coins = toCoins(amount);
  const freelancer = (coins * BigInt(freelancerPct)) / 100n;
  return { freelancer: freelancer.toString(), client: (coins - freelancer).toString() };
}

/** The platform fee on a payment to the freelancer (basis points, rounded down) and what they receive. */
export function feeSplit(amount: string | number | bigint, feeBps: number) {
  const coins = toCoins(amount);
  const fee = (coins * BigInt(feeBps)) / 10_000n;
  return { fee: fee.toString(), net: (coins - fee).toString() };
}

export function feePercent(feeBps: number) {
  return `${(feeBps / 100).toFixed(feeBps % 100 ? 2 : 0)}%`;
}
