import { formatEther, parseEther } from 'ethers';
import { CURRENCY } from '@/lib/env';

/**
 * Money helpers. Amounts are decimal strings (Postgres numeric) with at most 6 decimal places in
 * the app, and wei (bigint) on-chain. Arithmetic never uses floating point.
 */
const MICRO = 1_000_000n;
const AMOUNT_RE = /^(\d{1,20})(?:\.(\d{1,6}))?$/;

/** Parses user input like "1,250.5" into micro-units, or null if invalid. */
export function parseAmount(input: string | number | null | undefined): bigint | null {
  if (input === null || input === undefined) return null;
  const clean = String(input).trim().replace(/,/g, '');
  const match = AMOUNT_RE.exec(clean);
  if (!match) return null;
  return BigInt(match[1]) * MICRO + BigInt((match[2] ?? '').padEnd(6, '0') || '0');
}

export function microToAmount(micro: bigint): string {
  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const whole = abs / MICRO;
  const frac = (abs % MICRO).toString().padStart(6, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** "100.000000000000000000" → "100"; keeps up to 18 significant decimals for on-chain values. */
export function normalizeAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const str = String(value);
  if (!str.includes('.')) return str.replace(/^0+(?=\d)/, '');
  const trimmed = str.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed.replace(/^0+(?=\d)/, '') || '0';
}

function groupThousands(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Human display: "1,234.5 SHM". */
export function formatAmount(value: string | number | null | undefined, opts: { symbol?: boolean; maxDecimals?: number } = {}) {
  const normalized = normalizeAmount(value);
  const [whole, frac = ''] = normalized.split('.');
  const decimals = frac.slice(0, opts.maxDecimals ?? 6).replace(/0+$/, '');
  const text = `${groupThousands(whole)}${decimals ? `.${decimals}` : ''}`;
  return opts.symbol === false ? text : `${text} ${CURRENCY}`;
}

export function sumAmounts(values: (string | number)[]): string {
  let total = 0n;
  for (const v of values) total += toWei(v);
  return weiToAmount(total);
}

export function toWei(value: string | number): bigint {
  return parseEther(normalizeAmount(value));
}

export function weiToAmount(wei: bigint): string {
  return normalizeAmount(formatEther(wei));
}

/** Splits a milestone exactly like the escrow contract: freelancer share rounds down, in wei. */
export function splitByPct(amount: string, freelancerPct: number) {
  const wei = toWei(amount);
  const freelancer = (wei * BigInt(freelancerPct)) / 100n;
  return { freelancer: weiToAmount(freelancer), client: weiToAmount(wei - freelancer) };
}
