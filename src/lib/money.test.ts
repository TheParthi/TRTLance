import { describe, expect, it } from 'vitest';
import { formatAmount, microToAmount, normalizeAmount, parseAmount, splitByPct, sumAmounts, toWei } from './money';

describe('money', () => {
  it('parses user input into micro-units without floating point', () => {
    expect(parseAmount('1,250.5')).toBe(1_250_500_000n);
    expect(parseAmount('0.000001')).toBe(1n);
    expect(parseAmount('0.0000001')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(microToAmount(1_250_500_000n)).toBe('1250.5');
  });

  it('normalizes Postgres numerics and formats them for display', () => {
    expect(normalizeAmount('100.000000000000000000')).toBe('100');
    expect(normalizeAmount('0.500000000000000000')).toBe('0.5');
    expect(formatAmount('1234567.250000000000000000')).toBe('1,234,567.25 SHM');
    expect(formatAmount('12', { symbol: false })).toBe('12');
  });

  it('sums exactly and converts to wei', () => {
    expect(sumAmounts(['0.1', '0.2'])).toBe('0.3');
    expect(toWei('1.5')).toBe(1_500_000_000_000_000_000n);
  });

  it('splits like the escrow contract (freelancer share rounds down)', () => {
    expect(splitByPct('100', 40)).toEqual({ freelancer: '40', client: '60' });
    expect(splitByPct('0.000000000000000007', 33)).toEqual({ freelancer: '0.000000000000000002', client: '0.000000000000000005' });
  });
});
