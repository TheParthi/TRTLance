import { describe, expect, it } from 'vitest';
import { feePercent, feeSplit, formatAmount, formatRupees, normalizeAmount, parseAmount, splitByPct, sumAmounts, toCoins } from './money';

describe('money', () => {
  it('parses whole coins only, without floating point', () => {
    expect(parseAmount('1,250')).toBe(1250n);
    expect(parseAmount(' 10 000 ')).toBe(10000n);
    expect(parseAmount('12.5')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('normalizes Postgres numerics and formats them for display', () => {
    expect(normalizeAmount('100.000000000000000000')).toBe('100');
    expect(normalizeAmount('0007')).toBe('7');
    expect(toCoins('1500.000000000000000000')).toBe(1500n);
    expect(formatAmount('1234567.000000000000000000')).toBe('1,234,567 coins');
    expect(formatAmount('12', { symbol: false })).toBe('12');
    expect(formatRupees(150000)).toBe('₹1,500');
    expect(formatRupees(150050n)).toBe('₹1,500.50');
  });

  it('sums exactly', () => {
    expect(sumAmounts(['1500.000000000000000000', '3000', 2000n])).toBe('6500');
  });

  it('splits and charges fees like the database (rounding down)', () => {
    expect(splitByPct('100', 40)).toEqual({ freelancer: '40', client: '60' });
    expect(splitByPct('7', 33)).toEqual({ freelancer: '2', client: '5' });
    expect(feeSplit('1500', 1000)).toEqual({ fee: '150', net: '1350' });
    expect(feeSplit('999', 1000)).toEqual({ fee: '99', net: '900' });
    expect(feePercent(1000)).toBe('10%');
    expect(feePercent(750)).toBe('7.50%');
  });
});
