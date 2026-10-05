import { ExternalLink, FileText, Link2, StickyNote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/states';
import type { EvidenceWithUrl, MemberSummary } from '@/lib/data/disputes';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { Contract } from '@/lib/types';

const kindIcon = { file: FileText, link: Link2, note: StickyNote } as const;

export function EvidenceList({ evidence, members, contract }: {
  evidence: EvidenceWithUrl[];
  members: Record<string, MemberSummary>;
  contract: Pick<Contract, 'client_id' | 'freelancer_id'>;
}) {
  if (!evidence.length) {
    return <EmptyState compact icon={FileText} title="No evidence yet" description="Files, links and written notes added by either party or the arbitrator appear here." />;
  }
  return (
    <ul className="panel divide-y">
      {evidence.map((e) => {
        const Icon = kindIcon[e.kind];
        const who = members[e.submitted_by]?.display_name ?? 'Participant';
        const role = e.submitted_by === contract.client_id ? 'Client' : e.submitted_by === contract.freelancer_id ? 'Freelancer' : 'Arbitrator';
        return (
          <li key={e.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <span className="break-words">{e.title}</span>
              </p>
              <Badge tone={role === 'Client' ? 'info' : role === 'Freelancer' ? 'brand' : 'neutral'}>{role}</Badge>
            </div>
            {e.description && <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{e.description}</p>}
            {e.kind === 'file' && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {e.url_signed ? (
                  <a href={e.url_signed} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 break-all">
                    {e.file_name} <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-ink-muted">{e.file_name} (link unavailable — reload to try again)</span>
                )}
                <span className="t-meta">{formatBytes(e.size_bytes)}</span>
              </p>
            )}
            {e.kind === 'link' && e.url && (
              <a href={e.url} target="_blank" rel="noreferrer nofollow ugc" className="link inline-flex items-center gap-1 break-all text-sm">
                {e.url} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
            <p className="t-meta">Added by {who} · {formatDateTime(e.created_at)}</p>
          </li>
        );
      })}
    </ul>
  );
}
