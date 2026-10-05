import { describe, expect, it } from 'vitest';
import { escrowStatement, milestoneSegments, partWidths } from './escrow-summary';

const m = (position: number, amount: string, status: string, extra: Record<string, string> = {}) =>
  ({ id: `m${position}`, position, title: `M${position}`, amount, status, ...extra }) as never;

describe('escrow statement', () => {
  it('sums each money state exactly', () => {
    const s = escrowStatement([m(1, '20', 'paid'), m(2, '40.5', 'submitted'), m(3, '30', 'funded'), m(4, '10', 'disputed')]);
    expect(s).toEqual({ total: '100.5', secured: '70.5', released: '20', refunded: '0', disputed: '10', unfunded: '0' });
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
