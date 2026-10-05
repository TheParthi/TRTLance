import { ExternalLink, FileText, Link2, StickyNote } from 'lucide-react';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import type { EvidenceWithUrl, MemberSummary } from '@/lib/data/disputes';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { Contract } from '@/lib/types';

const kindIcon = { file: FileText, link: Link2, note: StickyNote } as const;
const kindLabel = { file: 'File', link: 'Link', note: 'Note' } as const;

/** Every item in the case file as a ledger: what it is, what it shows, who added it and when. */
export function EvidenceList({ evidence, members, contract, id = 'evidence', title, description, action, footer }: {
  evidence: EvidenceWithUrl[];
  members: Record<string, MemberSummary>;
  contract: Pick<Contract, 'client_id' | 'freelancer_id'>;
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Rendered under the list (e.g. the add-evidence form). */
  footer?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <Ledger
        id={id}
        className="scroll-mt-24"
        title={title ?? `Evidence (${evidence.length})`}
        description={description}
        action={action}
        empty={<p className="border-y py-5 text-sm text-ink-secondary">No evidence yet. Files, links and written notes added by either party or the arbitrator appear here.</p>}
      >
        {evidence.map((e) => {
          const Icon = kindIcon[e.kind];
          const who = members[e.submitted_by]?.display_name ?? 'Participant';
          const role = e.submitted_by === contract.client_id ? 'client' : e.submitted_by === contract.freelancer_id ? 'freelancer' : 'arbitrator';
          return (
            <LedgerRow
              key={e.id}
              className="flex-row items-start gap-3 sm:gap-4"
              lead={<span className="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-ink-muted"><Icon className="size-4" aria-hidden /><span className="sr-only">{kindLabel[e.kind]}</span></span>}
              meta={<><span>Added by {who} ({role})</span><time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time></>}
            >
              <div className="space-y-1">
                <p className="break-words text-sm font-medium">{e.title}</p>
                {e.description && <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{e.description}</p>}
                {e.kind === 'file' && (
                  <p className="flex flex-wrap items-center gap-x-2 text-sm">
                    {e.url_signed ? (
                      <a href={e.url_signed} target="_blank" rel="noreferrer" className="link inline-flex min-w-0 items-center gap-1 break-all">
                        {e.file_name} <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-ink-muted">{e.file_name} (link unavailable — reload to try again)</span>
                    )}
                    <span className="t-meta">{formatBytes(e.size_bytes)}</span>
                  </p>
                )}
                {e.kind === 'link' && e.url && (
                  <a href={e.url} target="_blank" rel="noreferrer nofollow ugc" className="link inline-flex items-center gap-1 break-all text-sm">
                    {e.url} <ExternalLink className="size-3 shrink-0" aria-hidden />
                  </a>
                )}
              </div>
            </LedgerRow>
          );
        })}
      </Ledger>
      {footer}
    </div>
  );
}
