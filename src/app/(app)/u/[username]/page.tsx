import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Globe, MapPin, PenLine, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Facts, Section } from '@/components/common/page-header';
import { TrustSignals } from '@/components/common/trust-signals';
import { getViewer } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { experienceLabel } from '@/lib/status';
import type { Intent, Profile, ProfileStats } from '@/lib/types';
import { getProfileByUsername, getPublicProfile, REVIEW_LIMIT } from './data';
import { ReviewsSection } from './reviews';
import { CertificationsSection, EducationSection, PortfolioSection } from './sections';

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
  id: '', email_verified: false, wallet_verified: false, rating_avg: null, review_count: 0,
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

  return (
    <div className="space-y-8">
      <ProfileHeader profile={profile} isOwner={isOwner} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <Section id="about" title="About">
            <div className="panel p-5">
              {profile.bio
                ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{profile.bio}</p>
                : <p className="text-sm text-ink-muted">{isOwner ? 'You have not written a bio yet. Add one in settings.' : `${firstName} has not written a bio yet.`}</p>}
            </div>
          </Section>

          {(profile.skills.length > 0 || profile.languages.length > 0) && (
            <Section id="skills" title="Skills">
              <div className="panel space-y-4 p-5">
                {profile.skills.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
                    {profile.skills.map((s) => <li key={s} className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-ink-secondary">{s}</li>)}
                  </ul>
                )}
                {profile.languages.length > 0 && (
                  <p className="text-sm text-ink-secondary"><span className="t-eyebrow mr-2">Languages</span>{profile.languages.join(', ')}</p>
                )}
              </div>
            </Section>
          )}

          {(profile.experience_level || profile.years_experience !== null) && (
            <Section id="experience" title="Experience">
              <div className="panel p-5">
                <Facts
                  items={[
                    { label: 'Level', value: profile.experience_level ? experienceLabel[profile.experience_level] : 'Not specified' },
                    { label: 'Years of experience', value: profile.years_experience !== null ? `${profile.years_experience} year${profile.years_experience === 1 ? '' : 's'}` : 'Not specified' },
                  ]}
                />
              </div>
            </Section>
          )}

          <PortfolioSection items={portfolio} isOwner={isOwner} />
          <EducationSection items={education} isOwner={isOwner} />
          <CertificationsSection items={certifications} isOwner={isOwner} />
          <ReviewsSection name={firstName} stats={data.stats} reviews={reviews} reviewers={reviewers} limit={REVIEW_LIMIT} />
        </div>

        <aside className="space-y-6">
          <section className="panel space-y-4 p-5" aria-labelledby="verification-title">
            <h2 id="verification-title" className="t-eyebrow">Verified facts</h2>
            {profile.intent === 'both' ? (
              <>
                <div className="space-y-2"><p className="text-xs font-semibold text-ink">As a freelancer</p><TrustSignals stats={stats} role="freelancer" /></div>
                <div className="space-y-2 border-t pt-4"><p className="text-xs font-semibold text-ink">As a client</p><TrustSignals stats={stats} role="client" /></div>
              </>
            ) : (
              <TrustSignals stats={stats} role={profile.intent === 'hire' ? 'client' : 'freelancer'} />
            )}
            <p className="text-xs text-ink-muted">Verified by TrustLance from account and contract records.</p>
          </section>

          <section className="panel space-y-3 p-5" aria-labelledby="credits-title">
            <h2 id="credits-title" className="t-eyebrow">Trust credits</h2>
            <p className="flex items-center gap-2">
              <Sparkles className="size-5 text-brass" aria-hidden />
              <span className="t-money text-3xl">{stats.trust_credits}</span>
            </p>
            <p className="text-xs text-ink-secondary">
              Earned from contract history: +20 per completed contract, +10 per 4–5★ review, −20 per dispute decided against them. Never below zero.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ProfileHeader({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  return (
    <header className="panel flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={profile.display_name} path={profile.avatar_path} size="xl" />
        <div className="min-w-0 space-y-1.5">
          <Badge tone={profile.intent === 'hire' ? 'info' : 'brand'}>{intentLabel[profile.intent]}</Badge>
          <h1 className="t-page-title break-words">{profile.display_name}</h1>
          {profile.headline && <p className="text-sm text-ink-secondary md:text-base">{profile.headline}</p>}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-ink-secondary">
            <li className="t-mono text-ink-muted">@{profile.username}</li>
            {profile.location && <li className="flex items-center gap-1.5"><MapPin className="size-3.5 text-ink-muted" aria-hidden />{profile.location}</li>}
            <li className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-ink-muted" aria-hidden />Member since {formatDate(profile.created_at, 'MMM yyyy')}</li>
            {profile.website_url && (
              <li className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-ink-muted" aria-hidden />
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer nofollow" className="link">
                  {profile.website_url.replace(/^https:\/\//, '').replace(/\/$/, '')}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      {isOwner && (
        <Button asChild variant="secondary" className="shrink-0">
          <Link href="/settings"><PenLine /> Edit profile</Link>
        </Button>
      )}
    </header>
  );
}
