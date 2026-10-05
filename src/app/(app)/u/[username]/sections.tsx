import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Certification, Education, PortfolioItem } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * One section of the profile: a small-caps label in its own column on large screens, the content beside it.
 * Sections sit in a stack separated by hairline rules.
 */
export function ProfileSection({ id, title, note, children, className }: {
  id: string;
  title: string;
  /** A short line under the label (e.g. "Self-reported"). */
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('grid grid-cols-1 gap-3 py-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10', className)}>
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="t-label-caps lg:pt-1">{title}</h2>
        {note && <p className="text-xs text-ink-muted">{note}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Owner-only prompt for an empty section: one line and where to fix it. */
function OwnerEmpty({ text }: { text: string }) {
  return (
    <p className="text-sm text-ink-secondary">
      {text} <Link className="link" href="/settings/portfolio">Add in settings</Link>
    </p>
  );
}

/** Dot + small caps: the item comes from a completed TrustLance contract. */
export function VerifiedContractMark() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.1em] text-success-strong">
      <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden />
      Verified contract
    </span>
  );
}

export function PortfolioSection({ items, isOwner }: { items: PortfolioItem[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <ProfileSection id="portfolio" title="Portfolio">
      {items.length === 0 ? (
        <OwnerEmpty text="No portfolio items yet. Work from completed contracts is marked as verified." />
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="space-y-1 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-medium leading-snug">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-baseline gap-1 hover:text-brand-strong hover:underline">
                      {item.title} <ExternalLink className="size-3.5 shrink-0 self-center text-ink-muted" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                {item.contract_id && <VerifiedContractMark />}
              </div>
              {item.description && <p className="line-clamp-3 whitespace-pre-line text-sm text-ink-secondary">{item.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}

export function EducationSection({ items, isOwner }: { items: Education[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <ProfileSection id="education" title="Education">
      {items.length === 0 ? (
        <OwnerEmpty text="No education added." />
      ) : (
        <ul className="divide-y">
          {items.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.school}</p>
                {(e.degree || e.field) && <p className="text-sm text-ink-secondary">{[e.degree, e.field].filter(Boolean).join(', ')}</p>}
              </div>
              {(e.start_year || e.end_year) && <p className="shrink-0 font-mono text-xs text-ink-muted">{e.start_year ?? '…'} – {e.end_year ?? 'present'}</p>}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}

export function CertificationsSection({ items, isOwner }: { items: Certification[]; isOwner: boolean }) {
  if (!items.length && !isOwner) return null;
  return (
    <ProfileSection id="certifications" title="Certifications" note={items.length ? 'Self-reported' : undefined}>
      {items.length === 0 ? (
        <OwnerEmpty text="No certifications added." />
      ) : (
        <ul className="divide-y">
          {items.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="t-meta">{[c.issuer, c.issued_on ? `Issued ${formatDate(c.issued_on, 'MMM yyyy')}` : null].filter(Boolean).join(' · ') || 'Issuer not given'}</p>
              </div>
              {c.credential_url && (
                <a href={c.credential_url} target="_blank" rel="noopener noreferrer nofollow" className="link inline-flex shrink-0 items-center gap-1 text-sm">
                  Check credential <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
