import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Ledger } from '@/components/common/ledger';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ProjectCard } from '@/components/projects/project-card';
import { SubNav } from '@/components/shell/sub-nav';
import { getCategories, getMilestonePlans, PAGE_SIZE, searchProjects } from '@/lib/data/projects';
import { PersonRow } from './person-card';
import { PEOPLE_PAGE_SIZE, searchPeople } from './people';

type SearchParams = Record<string, string | string[] | undefined>;
type SearchType = 'all' | 'projects' | 'people';
const TYPES: SearchType[] = ['all', 'projects', 'people'];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const q = one((await searchParams).q).trim().slice(0, 120);
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false } };
}

const href = (q: string, type: SearchType, page = 1) => {
  const params = new URLSearchParams({ q });
  if (type !== 'all') params.set('type', type);
  if (page > 1) params.set('page', String(page));
  return `/search?${params}`;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 120);
  const type = (TYPES as string[]).includes(one(sp.type)) ? (one(sp.type) as SearchType) : 'all';
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);

  return (
    <>
      <PageHeader title="Search" description="Find open projects and freelancers across TrustLance." />
      <form action="/search" role="search" className="mb-8 flex max-w-2xl gap-2">
        <label htmlFor="search-q" className="sr-only">Search projects and people</label>
        <Input id="search-q" name="q" type="search" defaultValue={q} placeholder="Try “react”, “logo design” or a name" maxLength={120} autoComplete="off" />
        {type !== 'all' && <input type="hidden" name="type" value={type} />}
        <Button type="submit"><SearchIcon /> Search</Button>
      </form>
      {q ? (
        <Suspense key={`${q}|${type}|${page}`} fallback={<ResultsSkeleton />}>
          <Results q={q} type={type} page={page} />
        </Suspense>
      ) : (
        <Quiet
          title="What are you looking for?"
          text="Search by keyword, skill or name. Results include open projects and freelancers with completed onboarding."
          action={<Link className="link" href="/work">Browse open projects</Link>}
        />
      )}
    </>
  );
}

async function Results({ q, type, page }: { q: string; type: SearchType; page: number }) {
  const [projects, people, categories] = await Promise.all([
    searchProjects({ q, page: type === 'projects' ? page : 1 }).then((v) => ({ ok: true as const, v }), (error: unknown) => {
      console.error('[search] projects failed', error);
      return { ok: false as const };
    }),
    searchPeople(q, type === 'people' ? page : 1).then((v) => ({ ok: true as const, v }), (error: unknown) => {
      console.error('[search] people failed', error);
      return { ok: false as const };
    }),
    getCategories().catch(() => []),
  ]);
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const plans = projects.ok ? await getMilestonePlans(projects.v.rows.map((p) => p.id)).catch(() => new Map()) : new Map();
  const projectCount = projects.ok ? projects.v.total : null;
  const peopleCount = people.ok ? people.v.total : null;
  const allCount = projectCount !== null && peopleCount !== null ? projectCount + peopleCount : null;
  const tabs: { type: SearchType; label: string; count: number | null }[] = [
    { type: 'all', label: 'All', count: allCount },
    { type: 'projects', label: 'Projects', count: projectCount },
    { type: 'people', label: 'People', count: peopleCount },
  ];
  const noResults = projects.ok && people.ok && projects.v.total === 0 && people.v.total === 0;
  const showProjects = type !== 'people';
  const showPeople = type !== 'projects';

  return (
    <div>
      <SubNav
        label="Result types"
        active={type}
        items={tabs.map((t) => ({ key: t.type, href: href(q, t.type), label: t.label, count: t.count ?? undefined }))}
      />

      <p className="sr-only" aria-live="polite">
        {allCount !== null ? `${allCount} result${allCount === 1 ? '' : 's'} for ${q}` : `Some results for ${q} could not be loaded`}
      </p>

      {noResults ? (
        <Quiet
          title={`No results for “${q}”`}
          text="Nothing matched in open projects or freelancer profiles. Check the spelling, or try a single skill like “react” or “copywriting”. People search covers freelancers; clients appear on their projects."
          action={<Link className="link" href="/work">Browse all open projects</Link>}
        />
      ) : (
        <div className="space-y-12">
          {showProjects && (
            <div className="space-y-3">
              <Ledger
                id="project-results"
                title="Projects"
                description={projects.ok && projects.v.total > 0 ? `${projects.v.total} open project${projects.v.total === 1 ? '' : 's'}` : undefined}
                action={type === 'all' && projects.ok && projects.v.total > 3 ? <Link href={href(q, 'projects')} className="link">See all {projects.v.total}</Link> : undefined}
                empty={
                  !projects.ok
                    ? <Quiet alert title="Projects could not be searched" text="This is a problem on our side, not a lack of results." action={<Link className="link" href={href(q, type, page)}>Try again</Link>} />
                    : <Quiet title="No open projects match" text="Try a skill or a broader keyword." action={<Link className="link" href="/work">Browse open projects</Link>} />
                }
              >
                {projects.ok && (type === 'all' ? projects.v.rows.slice(0, 3) : projects.v.rows).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} plan={plans.get(p.id)} /></li>)}
              </Ledger>
              {projects.ok && type === 'projects' && <Pager q={q} type="projects" page={projects.v.page} pages={Math.ceil(projects.v.total / PAGE_SIZE)} />}
            </div>
          )}

          {showPeople && (
            <div className="space-y-3">
              <Ledger
                id="people-results"
                title="People"
                description={people.ok && people.v.total > 0 ? `${people.v.total} freelancer${people.v.total === 1 ? '' : 's'}` : undefined}
                action={type === 'all' && people.ok && people.v.total > 6 ? <Link href={href(q, 'people')} className="link">See all {people.v.total}</Link> : undefined}
                empty={
                  !people.ok
                    ? <Quiet alert title="People could not be searched" text="This is a problem on our side, not a lack of results." action={<Link className="link" href={href(q, type, page)}>Try again</Link>} />
                    : <Quiet title="No freelancers match" text="Try a skill, a name or a username." action={<Link className="link" href={href(q, 'projects')}>Search projects instead</Link>} />
                }
              >
                {people.ok && (type === 'all' ? people.v.rows.slice(0, 6) : people.v.rows).map((p) => <PersonRow key={p.id} person={p} />)}
              </Ledger>
              {people.ok && type === 'people' && <Pager q={q} type="people" page={people.v.page} pages={Math.ceil(people.v.total / PEOPLE_PAGE_SIZE)} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pager({ q, type, page, pages }: { q: string; type: SearchType; page: number; pages: number }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-2 text-sm">
      {page > 1 ? <Link className="link" href={href(q, type, page - 1)}>← Previous</Link> : <span />}
      <span className="text-ink-muted">Page {page} of {pages}</span>
      {page < pages ? <Link className="link" href={href(q, type, page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Searching">
      <div className="flex gap-6 border-b pb-2.5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-20" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="ledger">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-8 py-5">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full max-w-xl" />
              </div>
              <Skeleton className="h-7 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Empty or failed result: a headline, one sentence and one way forward — no box. */
function Quiet({ title, text, action, alert }: { title: string; text: string; action?: React.ReactNode; alert?: boolean }) {
  return alert
    ? <ErrorState title={title} description={text} retry={action} />
    : <EmptyState compact title={title} description={text} action={action} />;
}
