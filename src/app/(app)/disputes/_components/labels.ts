import type { Contract, Dispute } from '@/lib/types';

export type CaseRole = 'client' | 'freelancer' | 'arbitrator' | 'admin' | 'other';

export function roleIn(contract: Pick<Contract, 'client_id' | 'freelancer_id'>, dispute: Pick<Dispute, 'arbitrator_id'>, uid: string | null | undefined): CaseRole {
  if (!uid) return 'other';
  if (uid === contract.client_id) return 'client';
  if (uid === contract.freelancer_id) return 'freelancer';
  if (uid === dispute.arbitrator_id) return 'arbitrator';
  return 'other';
}

export const roleLabel: Record<CaseRole, string> = {
  client: 'Client',
  freelancer: 'Freelancer',
  arbitrator: 'Arbitrator',
  admin: 'Platform admin',
  other: 'Participant',
};

export function requestedOutcomeLabel(outcome: Dispute['requested_outcome'], pct: number | null) {
  if (outcome === 'release') return 'Release the full amount to the freelancer';
  if (outcome === 'refund') return 'Refund the full amount to the client';
  return `Split: ${pct ?? 0}% to the freelancer, ${100 - (pct ?? 0)}% back to the client`;
}

export function decisionLabel(decision: NonNullable<Dispute['decision']>, pct: number) {
  if (decision === 'freelancer') return 'Full payment to the freelancer';
  if (decision === 'client') return 'Full refund to the client';
  return `${pct}% to the freelancer, ${100 - pct}% refunded to the client`;
}

const EVENT_LABELS: Record<string, string> = {
  'dispute.opened': 'Dispute opened',
  'dispute.assigned': 'Arbitrator assigned',
  'dispute.review_started': 'Evidence window closed, review started',
  'dispute.evidence_requested': 'More evidence requested',
  'dispute.escalated': 'Escalated to the platform team',
  'dispute.decided': 'Decision recorded',
  'dispute.settled': 'Settled on-chain by the escrow contract',
  'evidence.added': 'Evidence added',
};

export function eventLabel(type: string) {
  return EVENT_LABELS[type] ?? type.replace(/[._]/g, ' ');
}

export const HOURS_BEFORE_PARTY_ESCALATION = 48;

/** Mirrors escalate_dispute: a party may escalate only when no arbitrator was assigned within 48 hours. */
export function partyEscalation(dispute: Pick<Dispute, 'status' | 'arbitrator_id' | 'created_at'>, now = Date.now()) {
  if (dispute.status === 'resolved') return { allowed: false, reason: 'This dispute has been decided.' };
  if (dispute.status === 'escalated') return { allowed: false, reason: 'This dispute is already with the platform team.' };
  if (dispute.arbitrator_id) return { allowed: false, reason: 'An arbitrator is handling this case. Only they can escalate it now.' };
  const opensAt = new Date(dispute.created_at).getTime() + HOURS_BEFORE_PARTY_ESCALATION * 3_600_000;
  if (now < opensAt) {
    const hours = Math.ceil((opensAt - now) / 3_600_000);
    return { allowed: false, reason: `If no arbitrator is assigned, you can escalate in about ${hours} hour${hours === 1 ? '' : 's'}.` };
  }
  return { allowed: true, reason: 'No arbitrator was assigned within 48 hours. You can send this case to the platform team.' };
}
