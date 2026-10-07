import { cn } from '@/lib/utils';
import {
  contractStatus, disputeStatus, milestoneStatus, projectStatus, proposalStatus, settlementStatus, type StatusMeta, type Tone,
} from '@/lib/status';
import type {
  ContractStatus, DisputeStatus, MilestoneStatus, ProjectStatus, ProposalStatus, SettlementStatus,
} from '@/lib/types';

const markText: Record<Tone, string> = {
  neutral: 'text-ink-secondary',
  brand: 'text-brand-strong',
  info: 'text-info-strong',
  warning: 'text-warning-strong',
  success: 'text-success-strong',
  danger: 'text-danger-strong',
  refund: 'text-refund-strong',
  brass: 'text-brass-strong',
};

const markDot: Record<Tone, string> = {
  neutral: 'border border-ink-muted bg-transparent',
  brand: 'bg-brand',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-danger',
  refund: 'bg-refund',
  brass: 'bg-brass',
};

/**
 * The quiet way to show a state in a row: a dot and a small-caps label, no pill.
 * The label carries the meaning (colour is a second signal) and the description is read by screen readers.
 */
export function StatusMark({ meta, className, describe = true }: { meta: StatusMeta; className?: string; describe?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.1em]', markText[meta.tone], className)}>
      <span className={cn('inline-block size-1.5 shrink-0 rounded-full', markDot[meta.tone])} aria-hidden />
      {meta.label}
      {describe && <span className="sr-only">: {meta.description}</span>}
    </span>
  );
}

export const MilestoneStatusMark = ({ status, className }: { status: MilestoneStatus; className?: string }) => <StatusMark meta={milestoneStatus[status]} className={className} />;
export const ContractStatusMark = ({ status, className }: { status: ContractStatus; className?: string }) => <StatusMark meta={contractStatus[status]} className={className} />;
export const ProjectStatusMark = ({ status, className }: { status: ProjectStatus; className?: string }) => <StatusMark meta={projectStatus[status]} className={className} />;
export const ProposalStatusMark = ({ status, className }: { status: ProposalStatus; className?: string }) => <StatusMark meta={proposalStatus[status]} className={className} />;
export const DisputeStatusMark = ({ status, className }: { status: DisputeStatus; className?: string }) => <StatusMark meta={disputeStatus[status]} className={className} />;
export const SettlementStatusMark = ({ status, className }: { status: SettlementStatus; className?: string }) => <StatusMark meta={settlementStatus[status]} className={className} />;
