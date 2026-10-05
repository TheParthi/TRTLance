import type { Contract, Dispute, Milestone, Review } from '@/lib/types';

export type Role = 'client' | 'freelancer';

export interface NextAction {
  tone: 'action' | 'waiting' | 'done' | 'alert';
  title: string;
  detail: string;
  /** Anchor or path for the primary control. */
  target?: string;
  milestoneId?: string;
}

/**
 * "What do I need to do next?" for one contract and one party. Pure, so the same answer is used
 * on the dashboard, the contract list and the workspace.
 */
export function nextAction(
  role: Role,
  c: Pick<Contract, 'id' | 'status' | 'client_signed_at' | 'freelancer_signed_at'>,
  milestones: Pick<Milestone, 'id' | 'position' | 'title' | 'status'>[],
  disputes: Pick<Dispute, 'id' | 'status'>[] = [],
  reviews: Pick<Review, 'reviewer_role'>[] = [],
): NextAction {
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  const signedByMe = role === 'client' ? c.client_signed_at : c.freelancer_signed_at;

  switch (c.status) {
    case 'cancelled':
      return { tone: 'done', title: 'Contract cancelled', detail: 'It was cancelled before any money was deposited.' };
    case 'pending_signatures':
      return signedByMe
        ? { tone: 'waiting', title: `Waiting for the ${role === 'client' ? 'freelancer' : 'client'} to sign`, detail: 'You have signed. We’ll notify you when they do.' }
        : { tone: 'action', title: 'Review and sign the contract', detail: 'Both parties sign the same terms before any money moves.', target: '#sign' };
    case 'awaiting_funding':
      return role === 'client'
        ? { tone: 'action', title: 'Fund escrow to start the work', detail: 'Deposit the full contract amount from your verified wallet.', target: '#fund' }
        : { tone: 'waiting', title: 'Waiting for the client to fund escrow', detail: 'Do not start work until escrow shows as funded.' };
    case 'completed':
      return reviews.some((r) => r.reviewer_role === role)
        ? { tone: 'done', title: 'Contract complete', detail: 'All milestones are closed and your review is posted.' }
        : { tone: 'action', title: 'Leave a review', detail: `Rate your ${role === 'client' ? 'freelancer' : 'client'} — it only takes a minute.`, target: '?tab=review' };
  }

  const openDispute = disputes.find((d) => d.status !== 'resolved');
  const submitted = ordered.find((m) => m.status === 'submitted');
  const approved = ordered.find((m) => m.status === 'approved');
  const toDeliver = ordered.find((m) => m.status === 'revision_requested') ?? ordered.find((m) => m.status === 'funded');

  if (role === 'client') {
    if (approved) return { tone: 'action', title: `Release payment for milestone ${approved.position}`, detail: `You approved “${approved.title}”. Confirm the release in your wallet to pay the freelancer.`, target: `#milestone-${approved.position}`, milestoneId: approved.id };
    if (submitted) return { tone: 'action', title: `Review milestone ${submitted.position}`, detail: `“${submitted.title}” was submitted. Approve it or request changes.`, target: `#milestone-${submitted.position}`, milestoneId: submitted.id };
    if (openDispute) return { tone: 'alert', title: 'A dispute is in progress', detail: 'Follow the case and add evidence in the dispute workspace.', target: `/disputes/${openDispute.id}` };
    if (toDeliver) return { tone: 'waiting', title: `Waiting for milestone ${toDeliver.position}`, detail: `The freelancer is working on “${toDeliver.title}”.`, target: `#milestone-${toDeliver.position}` };
  } else {
    const revision = ordered.find((m) => m.status === 'revision_requested');
    if (revision) return { tone: 'action', title: `Changes requested on milestone ${revision.position}`, detail: 'Read the client’s feedback and submit an updated version.', target: `#milestone-${revision.position}`, milestoneId: revision.id };
    if (openDispute) return { tone: 'alert', title: 'A dispute is in progress', detail: 'Follow the case and add evidence in the dispute workspace.', target: `/disputes/${openDispute.id}` };
    if (approved) return { tone: 'waiting', title: `Milestone ${approved.position} approved`, detail: 'Payment is sent when the client confirms the release in their wallet.', target: `#milestone-${approved.position}` };
    if (submitted) return { tone: 'waiting', title: `Milestone ${submitted.position} is under review`, detail: 'The client will approve it or request changes.', target: `#milestone-${submitted.position}` };
    if (toDeliver) return { tone: 'action', title: `Deliver milestone ${toDeliver.position}`, detail: `“${toDeliver.title}” is funded in escrow. Submit your work when it’s ready.`, target: `#milestone-${toDeliver.position}`, milestoneId: toDeliver.id };
  }
  return { tone: 'waiting', title: 'Nothing to do right now', detail: 'We’ll notify you when something changes.' };
}
