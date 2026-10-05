import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { PageHeader, Section } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ProjectCard } from '@/components/projects/project-card';
import { getCategories, PAGE_SIZE, searchProjects } from '@/lib/data/projects';
import { cn } from '@/lib/utils';
import { PersonCard } from './person-card';
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
      <form action="/search" role="search" className="mb-6 flex max-w-2xl gap-2">
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
        <EmptyState
          icon={SearchIcon}
          title="What are you looking for?"
          description="Search by keyword, skill or name. Results include open projects and freelancers with completed onboarding."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="secondary"><Link href="/work">Browse open projects</Link></Button>
            </div>
          }
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
    <div className="space-y-6">
      <nav aria-label="Result types">
        <ul className="scrollbar-none -mb-px flex gap-1 overflow-x-auto border-b">
          {tabs.map((t) => (
            <li key={t.type} className="shrink-0">
              <Link
                href={href(q, t.type)}
                aria-current={t.type === type ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors',
                  t.type === type ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
                <span className="rounded-full bg-surface-sunken px-1.5 text-xs tabular-nums text-ink-secondary">{t.count ?? '—'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="sr-only" aria-live="polite">
        {allCount !== null ? `${allCount} result${allCount === 1 ? '' : 's'} for ${q}` : `Some results for ${q} could not be loaded`}
      </p>

      {noResults ? (
        <EmptyState
          icon={SearchX}
          title={`No results for “${q}”`}
          description={
            <span className="block space-y-2 text-left">
              <span className="block">Nothing matched in open projects or freelancer profiles. You could:</span>
              <span className="block">• Check the spelling, or use fewer or more general words.</span>
              <span className="block">• Search for a single skill, like “react” or “copywriting”.</span>
              <span className="block">• People search only covers freelancers; clients appear on their projects.</span>
            </span>
          }
          action={{ label: 'Browse all open projects', href: '/work' }}
        />
      ) : (
        <>
          {showProjects && (
            <Section
              title="Projects"
              description={projects.ok ? `${projects.v.total} open project${projects.v.total === 1 ? '' : 's'}` : undefined}
              action={type === 'all' && projects.ok && projects.v.total > 3 ? <Link href={href(q, 'projects')} className="link text-sm">See all {projects.v.total}</Link> : undefined}
            >
              {!projects.ok ? (
                <ErrorState title="Projects could not be searched" description="This is a problem on our side, not a lack of results. Try again in a moment." />
              ) : projects.v.rows.length === 0 ? (
                <EmptyState compact icon={SearchX} title="No open projects match" description="Try a skill or a broader keyword." />
              ) : (
                <>
                  <ul className="space-y-4">
                    {(type === 'all' ? projects.v.rows.slice(0, 3) : projects.v.rows).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} /></li>)}
                  </ul>
                  {type === 'projects' && <Pager q={q} type="projects" page={projects.v.page} pages={Math.ceil(projects.v.total / PAGE_SIZE)} />}
                </>
              )}
            </Section>
          )}

          {showPeople && (
            <Section
              title="People"
              description={people.ok ? `${people.v.total} freelancer${people.v.total === 1 ? '' : 's'}` : undefined}
              action={type === 'all' && people.ok && people.v.total > 6 ? <Link href={href(q, 'people')} className="link text-sm">See all {people.v.total}</Link> : undefined}
            >
              {!people.ok ? (
                <ErrorState title="People could not be searched" description="This is a problem on our side, not a lack of results. Try again in a moment." />
              ) : people.v.rows.length === 0 ? (
                <EmptyState compact icon={SearchX} title="No freelancers match" description="Try a skill, a name or a username." />
              ) : (
                <>
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {(type === 'all' ? people.v.rows.slice(0, 6) : people.v.rows).map((p) => <li key={p.id}><PersonCard person={p} /></li>)}
                  </ul>
                  {type === 'people' && <Pager q={q} type="people" page={people.v.page} pages={Math.ceil(people.v.total / PEOPLE_PAGE_SIZE)} />}
                </>
              )}
            </Section>
          )}
        </>
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
      <div className="flex gap-2 border-b pb-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-24" />)}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel space-y-3 p-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-2/3" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  );
}
