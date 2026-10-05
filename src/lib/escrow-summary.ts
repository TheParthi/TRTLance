import { toWei, weiToAmount } from '@/lib/money';
import type { MilestoneStatus } from '@/lib/types';

/** Money state of a milestone as drawn on the escrow rail. */
export type RailState = 'released' | 'approved' | 'review' | 'changes' | 'secured' | 'disputed' | 'refunded' | 'unfunded' | 'proposed';

export interface RailPart {
  state: RailState;
  amount: string;
}

export interface RailSegment {
  key: string;
  label: string;
  /** One part normally; a settled dispute splits into released + refunded. */
  parts: RailPart[];
}

type MilestoneLike = {
  id: string;
  position: number;
  title: string;
  amount: string;
  status: MilestoneStatus;
  freelancer_payout?: string | null;
  client_refund?: string | null;
};

const stateOf: Record<MilestoneStatus, RailState> = {
  pending: 'unfunded',
  funded: 'secured',
  submitted: 'review',
  revision_requested: 'changes',
  approved: 'approved',
  paid: 'released',
  disputed: 'disputed',
  refunded: 'refunded',
  settled: 'released',
};

export function milestoneSegments(milestones: MilestoneLike[]): RailSegment[] {
  return [...milestones]
    .sort((a, b) => a.position - b.position)
    .map((m) => {
      if (m.status === 'settled') {
        return {
          key: m.id,
          label: `${m.position}. ${m.title}`,
          parts: [
            { state: 'released' as const, amount: m.freelancer_payout ?? '0' },
            { state: 'refunded' as const, amount: m.client_refund ?? '0' },
          ].filter((p) => toWei(p.amount) > 0n),
        };
      }
      return { key: m.id, label: `${m.position}. ${m.title}`, parts: [{ state: stateOf[m.status], amount: m.amount }] };
    });
}

export function proposalSegments(milestones: { id?: string; position: number; title: string; amount: string }[]): RailSegment[] {
  return [...milestones]
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ key: m.id ?? String(m.position), label: `${m.position}. ${m.title}`, parts: [{ state: 'proposed' as const, amount: m.amount }] }));
}

export interface EscrowStatement {
  total: string;
  /** Locked in escrow: secured, under review, changes requested, approved. */
  secured: string;
  released: string;
  refunded: string;
  disputed: string;
  unfunded: string;
}

/** Exact totals in SHM (wei arithmetic, never floats). */
export function escrowStatement(milestones: MilestoneLike[]): EscrowStatement {
  const sums: Record<RailState, bigint> = { released: 0n, approved: 0n, review: 0n, changes: 0n, secured: 0n, disputed: 0n, refunded: 0n, unfunded: 0n, proposed: 0n };
  let total = 0n;
  for (const seg of milestoneSegments(milestones)) {
    for (const p of seg.parts) {
      const wei = toWei(p.amount);
      sums[p.state] += wei;
      total += wei;
    }
  }
  return {
    total: weiToAmount(total),
    secured: weiToAmount(sums.secured + sums.review + sums.changes + sums.approved),
    released: weiToAmount(sums.released),
    refunded: weiToAmount(sums.refunded),
    disputed: weiToAmount(sums.disputed),
    unfunded: weiToAmount(sums.unfunded),
  };
}

/** Width of each part as a percentage of the whole rail (sums to 100, minimum visible width kept). */
export function partWidths(segments: RailSegment[]): number[][] {
  const total = segments.reduce((t, s) => t + s.parts.reduce((u, p) => u + toWei(p.amount), 0n), 0n);
  if (total === 0n) return segments.map((s) => s.parts.map(() => 100 / Math.max(1, segments.length * s.parts.length)));
  return segments.map((s) => s.parts.map((p) => Number((toWei(p.amount) * 1_000_000n) / total) / 10_000));
}

const STATE_ORDER: RailState[] = ['released', 'approved', 'review', 'changes', 'secured', 'disputed', 'refunded', 'unfunded'];

/** One segment per money state — for totals across many contracts, where per-milestone segments would be noise. */
export function stateSegments(milestones: MilestoneLike[]): RailSegment[] {
  const sums = new Map<RailState, bigint>();
  for (const seg of milestoneSegments(milestones)) {
    for (const p of seg.parts) sums.set(p.state, (sums.get(p.state) ?? 0n) + toWei(p.amount));
  }
  return STATE_ORDER.filter((s) => (sums.get(s) ?? 0n) > 0n).map((s) => ({ key: s, label: s, parts: [{ state: s, amount: weiToAmount(sums.get(s)!) }] }));
}
