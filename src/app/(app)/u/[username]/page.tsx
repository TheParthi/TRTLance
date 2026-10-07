import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, MapPin, PenLine, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { LedgerField } from '@/components/marketing/ledger-field';
import { SplitWords } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';
import { TrustLine } from '@/components/common/trust-signals';
import { getViewer } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { experienceLabel } from '@/lib/status';
import type { Intent, Profile, ProfileStats } from '@/lib/types';
import { getProfileByUsername, getPublicProfile, REVIEW_LIMIT } from './data';
import { ReviewsSection } from './reviews';
import { CertificationsSection, EducationSection, PortfolioSection, ProfileSection } from './sections';

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await getProfileByUsername((await params).username).catch(() => null);
  if (!profile) return { title: 'Profile not found' };
  return { title: profile.display_name, description: profile.headline ?? `${profile.display_name} on TrustLance` };
}

const intentLabel: Record<Intent, string> = {
  hire: 'Hires on TrustLance',
  work: 'Freelancer',
  both: 'Freelancer · Hires on TrustLance',
};

const EMPTY_STATS: ProfileStats = {
  id: '', email_verified: false, identity_verified: false, rating_avg: null, review_count: 0,
  completed_as_freelancer: 0, completed_as_client: 0, funded_as_client: 0, disputes_lost: 0, trust_credits: 0,
};

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;
  const [data, viewer] = await Promise.all([getPublicProfile(username), getViewer()]);
  if (!data) notFound();
  const { profile, portfolio, education, certifications, reviews, reviewers } = data;
  const stats = data.stats ?? EMPTY_STATS;
  const isOwner = viewer?.id === profile.id;
  const firstName = profile.display_name.split(' ')[0];
  const experience = [
    profile.experience_level ? experienceLabel[profile.experience_level] : null,
    profile.years_experience !== null ? `${profile.years_experience} year${profile.years_experience === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div>
      <ProfileHeader profile={profile} stats={stats} isOwner={isOwner} />

      <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y py-5">
        <Fact label="Member since">{formatDate(profile.created_at, 'MMM yyyy')}</Fact>
        {experience && <Fact label="Experience">{experience}</Fact>}
        {profile.languages.length > 0 && <Fact label="Languages">{profile.languages.join(', ')}</Fact>}
      </dl>

      <div className="divide-y border-b">
        {(profile.bio || isOwner) && (
          <ProfileSection id="about" title="About">
            {profile.bio
              ? <p className="max-w-prose whitespace-pre-line leading-relaxed text-ink-secondary">{profile.bio}</p>
              : <p className="text-sm text-ink-secondary">You have not written a bio yet. <Link className="link" href="/settings">Add one in settings</Link></p>}
          </ProfileSection>
        )}

        {profile.skills.length > 0 && (
          <ProfileSection id="skills" title="Skills">
            <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
              {profile.skills.map((s) => <li key={s} className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-ink-secondary">{s}</li>)}
            </ul>
          </ProfileSection>
        )}

        <PortfolioSection items={portfolio} isOwner={isOwner} />
        <EducationSection items={education} isOwner={isOwner} />
        <CertificationsSection items={certifications} isOwner={isOwner} />
        <ReviewsSection name={firstName} stats={data.stats} reviews={reviews} reviewers={reviewers} limit={REVIEW_LIMIT} />

        <ProfileSection id="credits" title="Trust credits">
          <p className="max-w-prose text-sm text-ink-secondary">
            <span className="mr-1 inline-flex items-center gap-1 align-baseline"><Sparkles className="size-3.5 self-center text-brass" aria-hidden /><span className="t-money text-base text-ink">{stats.trust_credits}</span></span> credits, earned from contract history on TrustLance: +20 per completed contract,
            +10 per 4–5★ review, −20 per dispute decided against them. Never below zero.
          </p>
        </ProfileSection>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="t-label-caps">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ProfileHeader({ profile, stats, isOwner }: { profile: Profile; stats: ProfileStats; isOwner: boolean }) {
  return (
    <header className="relative mx-[calc(50%-50vw)] -mt-6 mb-8 overflow-hidden border-b md:-mt-10">
      <LedgerField density={18} pulses={2} className="opacity-60 [mask-image:linear-gradient(to_bottom,black_15%,transparent_95%)]" />
      <div className="relative mx-auto flex max-w-content flex-col gap-6 px-4 pb-10 pt-10 md:flex-row md:items-end md:justify-between md:px-6 md:pb-14 md:pt-16">
      <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
        <Avatar name={profile.display_name} path={profile.avatar_path} size="xl" />
        <div className="min-w-0 space-y-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{intentLabel[profile.intent]}</p>
          <h1 className="break-words font-display text-[clamp(2.6rem,5.8vw,5.25rem)] font-medium leading-[0.95] tracking-[-0.04em]"><SplitWords text={profile.display_name} immediate stagger={45} /></h1>
          {profile.headline && <p className="text-ink-secondary md:text-lg">{profile.headline}</p>}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-secondary">
            <li className="font-mono text-xs text-ink-muted">@{profile.username}</li>
            {profile.location && <li className="flex items-center gap-1.5"><MapPin className="size-3.5 text-ink-muted" aria-hidden />{profile.location}</li>}
            {profile.website_url && (
              <li className="flex min-w-0 items-center gap-1.5">
                <Globe className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer nofollow" className="link truncate">
                  {profile.website_url.replace(/^https:\/\//, '').replace(/\/$/, '')}
                </a>
              </li>
            )}
          </ul>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1">
            <TrustLine stats={stats} role={profile.intent === 'hire' ? 'client' : 'freelancer'} />
            {profile.intent === 'both' && stats.funded_as_client > 0 && (
              <span className="text-xs text-ink-secondary">
                <span aria-hidden className="mr-2 text-line-strong">·</span>
                {stats.funded_as_client} contract{stats.funded_as_client === 1 ? '' : 's'} funded as a client
              </span>
            )}
          </p>
        </div>
      </div>
      {isOwner && (
        <Button asChild variant="secondary" className="shrink-0 self-start">
          <Link href="/settings"><PenLine /> Edit profile</Link>
        </Button>
      )}
      </div>
    </header>
  );
}
