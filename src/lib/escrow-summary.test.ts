import { describe, expect, it } from 'vitest';
import { escrowStatement, milestoneSegments, partWidths } from './escrow-summary';

const m = (position: number, amount: string, status: string, extra: Record<string, string> = {}) =>
  ({ id: `m${position}`, position, title: `M${position}`, amount, status, ...extra }) as never;

describe('escrow statement', () => {
  it('sums each money state exactly', () => {
    const s = escrowStatement([m(1, '2000', 'paid'), m(2, '4050', 'submitted'), m(3, '3000', 'funded'), m(4, '1000', 'disputed')]);
    expect(s).toEqual({ total: '10050', secured: '7050', released: '2000', refunded: '0', disputed: '1000', unfunded: '0' });
  });

  it('splits a settled milestone into released and refunded parts', () => {
    const segs = milestoneSegments([m(1, '10', 'settled', { freelancer_payout: '4', client_refund: '6' })]);
    expect(segs[0].parts).toEqual([{ state: 'released', amount: '4' }, { state: 'refunded', amount: '6' }]);
    expect(escrowStatement([m(1, '10', 'settled', { freelancer_payout: '4', client_refund: '6' })])).toMatchObject({ released: '4', refunded: '6' });
  });

  it('computes proportional widths that add up to 100', () => {
    const widths = partWidths(milestoneSegments([m(1, '25', 'funded'), m(2, '75', 'funded')]));
    expect(widths).toEqual([[25], [75]]);
  });
});
