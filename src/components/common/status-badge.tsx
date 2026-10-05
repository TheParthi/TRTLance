import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  contractStatus, disputeStatus, milestoneStatus, projectStatus, proposalStatus, settlementStatus, txStatus, type StatusMeta,
} from '@/lib/status';
import type {
  ContractStatus, DisputeStatus, EscrowTxStatus, MilestoneStatus, ProjectStatus, ProposalStatus, SettlementStatus,
} from '@/lib/types';
import { StatusIcon } from './status-icon';

/** Icon + label + colour. The description is exposed to screen readers and as a tooltip. */
export function StatusBadge({ meta, className, describe = true }: { meta: StatusMeta; className?: string; describe?: boolean }) {
  const badge = (
    <Badge tone={meta.tone} className={className}>
      <StatusIcon name={meta.icon} />
      {meta.label}
      {describe && <span className="sr-only">: {meta.description}</span>}
    </Badge>
  );
  return describe ? <Tooltip content={meta.description}><span className="inline-flex">{badge}</span></Tooltip> : badge;
}

export const MilestoneStatusBadge = ({ status }: { status: MilestoneStatus }) => <StatusBadge meta={milestoneStatus[status]} />;
export const ContractStatusBadge = ({ status }: { status: ContractStatus }) => <StatusBadge meta={contractStatus[status]} />;
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => <StatusBadge meta={projectStatus[status]} />;
export const ProposalStatusBadge = ({ status }: { status: ProposalStatus }) => <StatusBadge meta={proposalStatus[status]} />;
export const DisputeStatusBadge = ({ status }: { status: DisputeStatus }) => <StatusBadge meta={disputeStatus[status]} />;
export const SettlementStatusBadge = ({ status }: { status: SettlementStatus }) => <StatusBadge meta={settlementStatus[status]} />;
export const TxStatusBadge = ({ status }: { status: EscrowTxStatus }) => <StatusBadge meta={txStatus[status]} />;
