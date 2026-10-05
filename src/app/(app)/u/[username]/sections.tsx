import { Award, BadgeCheck, ExternalLink, FolderOpen, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { formatDate } from '@/lib/format';
import type { Certification, Education, PortfolioItem } from '@/lib/types';

const manage = { label: 'Manage in settings', href: '/settings/portfolio' };

export function PortfolioSection({ items, isOwner }: { items: PortfolioItem[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <Section id="portfolio" title="Portfolio">
      {items.length === 0 ? (
        <EmptyState compact icon={FolderOpen} title="No portfolio items yet" description="Show examples of your work. Work from completed contracts is marked as verified." action={manage} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="panel flex flex-col gap-2 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                {item.contract_id && <Badge tone="success"><BadgeCheck aria-hidden /> Verified contract</Badge>}
              </div>
              {item.description && <p className="line-clamp-4 whitespace-pre-line text-sm text-ink-secondary">{item.description}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="link mt-auto inline-flex items-center gap-1 text-sm">
                  View project <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function EducationSection({ items, isOwner }: { items: Education[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <Section id="education" title="Education">
      {items.length === 0 ? (
        <EmptyState compact icon={GraduationCap} title="No education added" action={manage} />
      ) : (
        <ul className="panel divide-y">
          {items.map((e) => (
            <li key={e.id} className="flex gap-3 p-4">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.school}</p>
                {(e.degree || e.field) && <p className="text-sm text-ink-secondary">{[e.degree, e.field].filter(Boolean).join(', ')}</p>}
                {(e.start_year || e.end_year) && <p className="t-meta">{e.start_year ?? '…'} – {e.end_year ?? 'present'}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function CertificationsSection({ items, isOwner }: { items: Certification[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <Section id="certifications" title="Certifications" description={items.length ? 'Self-reported. Follow the credential link to check with the issuer.' : undefined}>
      {items.length === 0 ? (
        <EmptyState compact icon={Award} title="No certifications added" action={manage} />
      ) : (
        <ul className="panel divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex gap-3 p-4">
              <Award className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="t-meta">{[c.issuer, c.issued_on ? `Issued ${formatDate(c.issued_on, 'MMM yyyy')}` : null].filter(Boolean).join(' · ') || 'Issuer not given'}</p>
              </div>
              {c.credential_url && (
                <a href={c.credential_url} target="_blank" rel="noopener noreferrer nofollow" className="link inline-flex shrink-0 items-center gap-1 text-sm">
                  Credential <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
