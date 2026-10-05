'use client';

import { MoneyRing, type RingState } from '@/components/common/money-ring';
import type { MilestoneStatus } from '@/lib/types';

export const ringStateOf: Record<MilestoneStatus, RingState> = {
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

/**
 * This contract's escrow as the 3D ring: one arc per real milestone, sized by its amount and coloured
 * by its real state; the milestone that needs attention steps forward. The readout repeats the facts in text.
 */
export function ContractRing({ milestones, focus, readout, className }: {
  milestones: { amount: string; status: MilestoneStatus }[];
  focus: number | null;
  readout: { label: string; state: string; amount: string } | null;
  className?: string;
}) {
  return (
    <MoneyRing
      className={className}
      parts={milestones.map((m) => ({ amount: Number(m.amount) || 0, state: ringStateOf[m.status] }))}
      focus={focus}
      readout={readout}
    />
  );
}
