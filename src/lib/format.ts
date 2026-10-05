import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { publicEnv } from '@/lib/env';

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, 'd MMM yyyy, HH:mm');
}

export function formatRelative(value: string | Date | null | undefined) {
  const d = toDate(value);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  if (Math.abs(diff) < 45_000) return 'just now';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function shortAddress(address: string | null | undefined) {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash: string | null | undefined) {
  if (!hash) return '—';
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function explorerTxUrl(hash: string) {
  return publicEnv.chain.explorerUrl ? `${publicEnv.chain.explorerUrl}/tx/${hash}` : null;
}

export function explorerAddressUrl(address: string) {
  return publicEnv.chain.explorerUrl ? `${publicEnv.chain.explorerUrl}/address/${address}` : null;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function disputeNumber(n: number) {
  return `DSP-${String(n).padStart(6, '0')}`;
}

export function daysUntil(value: string | null | undefined) {
  const d = toDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}
