import type {
  CoinTxKind, ContractStatus, DisputeStatus, MilestoneStatus, ProjectStatus, ProposalStatus, SettlementStatus, WithdrawalStatus,
} from '@/lib/types';

/**
 * One vocabulary for every state shown in the UI. Each state has a label, a tone (colour family),
 * an icon and a sentence explaining what it means — colour is never the only signal.
 */
export type Tone = 'neutral' | 'brand' | 'info' | 'warning' | 'success' | 'danger' | 'refund' | 'brass';
export type IconName =
  | 'circle-dashed' | 'lock' | 'upload' | 'eye' | 'check' | 'check-check' | 'coins' | 'alert' | 'undo' | 'scale'
  | 'pen' | 'wallet' | 'play' | 'ban' | 'flag' | 'clock' | 'x' | 'send' | 'archive' | 'loader';

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: IconName;
  description: string;
}

export const milestoneStatus: Record<MilestoneStatus, StatusMeta> = {
  pending: { label: 'Not funded', tone: 'neutral', icon: 'circle-dashed', description: 'Waiting for the client to lock the coins in escrow.' },
  funded: { label: 'Secured', tone: 'brand', icon: 'lock', description: 'The coins are locked in escrow. Work can begin.' },
  submitted: { label: 'Under review', tone: 'info', icon: 'eye', description: 'Work was submitted and is waiting for the client.' },
  revision_requested: { label: 'Changes requested', tone: 'warning', icon: 'pen', description: 'The client asked for changes before approving.' },
  approved: { label: 'Approved', tone: 'success', icon: 'check', description: 'Approved and waiting to be paid from escrow.' },
  paid: { label: 'Released', tone: 'success', icon: 'check-check', description: 'Paid to the freelancer’s earnings, less the platform fee.' },
  disputed: { label: 'Disputed', tone: 'danger', icon: 'alert', description: 'Frozen while an arbitrator reviews the dispute.' },
  refunded: { label: 'Refunded', tone: 'refund', icon: 'undo', description: 'Returned to the client’s coin wallet.' },
  settled: { label: 'Settled', tone: 'refund', icon: 'scale', description: 'Split between both parties by an arbitrator’s decision.' },
};

export const contractStatus: Record<ContractStatus, StatusMeta> = {
  pending_signatures: { label: 'Awaiting signatures', tone: 'warning', icon: 'pen', description: 'Both parties must sign the terms.' },
  awaiting_funding: { label: 'Awaiting funding', tone: 'warning', icon: 'wallet', description: 'Signed. The client must lock the full amount in escrow.' },
  active: { label: 'Active', tone: 'brand', icon: 'lock', description: 'The coins are locked in escrow and work is in progress.' },
  disputed: { label: 'In dispute', tone: 'danger', icon: 'alert', description: 'At least one milestone is under dispute.' },
  completed: { label: 'Completed', tone: 'success', icon: 'check-check', description: 'Every milestone is closed.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'ban', description: 'Cancelled before any coins were locked.' },
};

export const projectStatus: Record<ProjectStatus, StatusMeta> = {
  draft: { label: 'Draft', tone: 'neutral', icon: 'pen', description: 'Only you can see this project.' },
  open: { label: 'Open', tone: 'info', icon: 'send', description: 'Accepting proposals.' },
  in_contract: { label: 'Hired', tone: 'brand', icon: 'lock', description: 'A freelancer has been hired.' },
  completed: { label: 'Completed', tone: 'success', icon: 'check-check', description: 'The contract is complete.' },
  cancelled: { label: 'Closed', tone: 'neutral', icon: 'archive', description: 'Closed without hiring.' },
};

export const proposalStatus: Record<ProposalStatus, StatusMeta> = {
  pending: { label: 'Pending', tone: 'info', icon: 'clock', description: 'Waiting for the client.' },
  accepted: { label: 'Hired', tone: 'success', icon: 'check', description: 'The client hired you.' },
  declined: { label: 'Not selected', tone: 'neutral', icon: 'x', description: 'The client did not choose this proposal.' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral', icon: 'undo', description: 'The proposal was withdrawn.' },
};

export const disputeStatus: Record<DisputeStatus, StatusMeta> = {
  open: { label: 'Waiting for arbitrator', tone: 'warning', icon: 'clock', description: 'No arbitrator has been assigned yet.' },
  awaiting_evidence: { label: 'Collecting evidence', tone: 'info', icon: 'upload', description: 'Both parties can add evidence before the review starts.' },
  under_review: { label: 'Under review', tone: 'info', icon: 'scale', description: 'The arbitrator is reviewing the case.' },
  resolved: { label: 'Decided', tone: 'success', icon: 'check', description: 'The arbitrator has made a decision.' },
  escalated: { label: 'Escalated', tone: 'danger', icon: 'flag', description: 'Sent to the TrustLance platform team.' },
};

export const settlementStatus: Record<SettlementStatus, StatusMeta> = {
  pending: { label: 'Not settled', tone: 'info', icon: 'clock', description: 'The coins stay frozen until the decision.' },
  settled: { label: 'Settled', tone: 'success', icon: 'check-check', description: 'The coins were paid out as decided.' },
};

export const withdrawalStatus: Record<WithdrawalStatus, StatusMeta> = {
  requested: { label: 'Processing', tone: 'info', icon: 'loader', description: 'TrustLance is sending the money to your bank account.' },
  paid: { label: 'Paid', tone: 'success', icon: 'check-check', description: 'Sent to your bank account.' },
  failed: { label: 'Returned', tone: 'danger', icon: 'x', description: 'The transfer did not go through. The coins are back in your earnings.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'undo', description: 'You cancelled it. The coins are back in your earnings.' },
};

export const coinTxLabel: Record<CoinTxKind, string> = {
  purchase: 'Bought coins',
  fund: 'Locked in escrow',
  release: 'Milestone payment',
  refund: 'Milestone refund',
  settlement: 'Dispute settlement',
  hold_release: 'Now withdrawable',
  withdrawal: 'Withdrawal requested',
  withdrawal_paid: 'Paid to bank',
  withdrawal_returned: 'Withdrawal returned',
};

export const disputeReasonLabel = {
  quality: 'Quality of work',
  scope: 'Work outside the agreed scope',
  deadline: 'Missed deadline',
  non_responsive: 'Other party not responding',
  non_payment: 'Approved work not paid',
  other: 'Something else',
} as const;

export const experienceLabel = { entry: 'Entry level', intermediate: 'Intermediate', expert: 'Expert' } as const;

/** Milestone states in which the money is still locked in escrow. */
export const LOCKED_MILESTONE_STATES: MilestoneStatus[] = ['funded', 'submitted', 'revision_requested', 'approved', 'disputed'];
