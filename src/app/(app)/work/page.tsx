import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Search } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ChipStrip } from '@/components/projects/chip-strip';
import { ProjectCard } from '@/components/projects/project-card';
import { WorkFilters } from '@/components/projects/work-filters';
import { getCategories, PAGE_SIZE, searchProjects, type ProjectFilters } from '@/lib/data/projects';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { MilestonePlanItem } from '@/lib/types';
import { searchPeople } from '../search/people';

export const metadata: Metadata = { title: 'Find work' };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const FORM_ID = 'work';

export default async function WorkPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const filters: ProjectFilters = {
    q: one(sp.q).slice(0, 120),
    category: one(sp.category),
    skills: one(sp.skills).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 10),
    min: /^\d+(\.\d+)?$/.test(one(sp.min)) ? one(sp.min) : '',
    max: /^\d+(\.\d+)?$/.test(one(sp.max)) ? one(sp.max) : '',
    experience: ['entry', 'intermediate', 'expert'].includes(one(sp.experience)) ? one(sp.experience) : '',
    sort: ['newest', 'relevance', 'budget_high', 'budget_low', 'fewest_proposals'].includes(one(sp.sort)) ? one(sp.sort) : '',
    page: Number(one(sp.page)) || 1,
  };

  const [viewer, categories] = await Promise.all([getViewer(), getCategories().catch(() => [])]);
  let result: Awaited<ReturnType<typeof searchProjects>> | null = null;
  try {
    result = await searchProjects(filters);
  } catch (error) {
    console.error('[work] search failed', error);
  }
  const active = [filters.q, filters.category, filters.skills?.length, filters.min, filters.max, filters.experience].filter(Boolean).length;
  const refined = [filters.skills?.length, filters.min, filters.max, filters.experience].filter(Boolean).length;
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  // When nothing matches, still show what is open rather than a dead end.
  const others = result && result.rows.length === 0 && active
    ? await searchProjects({ sort: 'newest' }).then((r) => r.rows.slice(0, 5)).catch(() => [])
    : [];
  // The field also finds people: a short line of matching freelancers links to the full people search.
  const people = filters.q ? await searchPeople(filters.q).catch(() => null) : null;

  const supabase = await createClient();
  const listed = [...(result?.rows ?? []), ...others];
  const { data: planRows } = listed.length
    ? await supabase.from('projects').select('id, milestone_plan').in('id', listed.map((p) => p.id))
    : { data: [] as { id: string; milestone_plan: MilestonePlanItem[] }[] };
  const plans = new Map((planRows ?? []).map((r) => [r.id as string, (r.milestone_plan ?? []) as MilestonePlanItem[]]));
  const catMap = new Map(categories.map((c) => [c.slug, c]));

  /** The current URL with some parameters replaced; the page resets unless set explicitly. */
  const hrefWith = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => k !== 'page' && one(v) && params.set(k, one(v)));
    Object.entries(patch).forEach(([k, v]) => (v ? params.set(k, v) : params.delete(k)));
    const query = params.toString();
    return query ? `/work?${query}` : '/work';
  };
  const categoryLabel = filters.category ? catMap.get(filters.category)?.label : null;

  return (
    <>
      <PageHeader
        eyebrow={result ? `${result.total} open project${result.total === 1 ? '' : 's'} · every one paid through escrow` : 'Open projects'}
        title="Find work"
        description="Open projects from clients on TrustLance — every contract is funded in escrow before work starts."
        actions={viewer && viewer.profile.intent !== 'work' ? <Button asChild variant="secondary"><Link href="/projects/new">Post a project</Link></Button> : undefined}
      />

      {/* One GET form: the search, the category (set by the chips) and the refining filters travel together. */}
      <form id={FORM_ID} action="/work" className="min-w-0 space-y-5">
        <div role="search" aria-label="Projects and people" className="flex gap-2">
          <label htmlFor={`${FORM_ID}-q`} className="sr-only">Search projects, skills or people</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input id={`${FORM_ID}-q`} name="q" type="search" defaultValue={filters.q} placeholder="Search projects, skills or people" className="h-12 pl-11 text-base" />
          </div>
          <Button type="submit" size="lg" className="px-4 sm:px-5" aria-label="Search"><Search className="sm:hidden" aria-hidden /><span className="hidden sm:inline">Search</span></Button>
        </div>
        {filters.category && <input type="hidden" name="category" value={filters.category} />}

        {categories.length > 0 && (
          <ChipStrip
            label="Categories"
            items={[{ slug: '', label: 'All' }, ...categories].map((c) => ({
              key: c.slug || 'all',
              label: c.label,
              href: hrefWith({ category: c.slug || null }),
              current: (filters.category || '') === c.slug,
            }))}
          />
        )}

        <WorkFilters
          formId={FORM_ID}
          count={refined}
          initialOpen={refined > 0}
          values={{
            q: filters.q ?? '',
            category: filters.category ?? '',
            skills: filters.skills?.join(', ') ?? '',
            min: filters.min ?? '',
            max: filters.max ?? '',
            experience: filters.experience ?? '',
            sort: filters.sort || (filters.q ? 'relevance' : 'newest'),
            sortChosen: Boolean(filters.sort),
          }}
          summary={
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 id="results-heading" className="text-sm text-ink-secondary" aria-live="polite">
                {result
                  ? <><span className="font-semibold text-ink">{result.total}</span> open project{result.total === 1 ? '' : 's'}{categoryLabel ? ` in ${categoryLabel}` : ''}{filters.q ? ` matching “${filters.q}”` : ''}</>
                  : 'Results'}
              </h2>
              {active > 0 && <Link href="/work" className="link inline-flex h-10 items-center text-sm lg:h-auto">Clear all</Link>}
            </div>
          }
        >
          <section aria-labelledby="results-heading" className="space-y-6">
            {people && people.rows.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="t-label-caps">People</span>
                {people.rows.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/u/${p.username}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                    <Avatar name={p.display_name} path={p.avatar_path} size="xs" /> {p.display_name}
                  </Link>
                ))}
                <Link className="link" href={`/search?${new URLSearchParams({ q: filters.q ?? '', type: 'people' })}`}>
                  {people.total > 3 ? `All ${people.total} people` : 'Search people'}
                </Link>
              </p>
            )}

            {!result ? (
              <ErrorState description="Projects could not be loaded right now. Your filters are kept in the address bar — refresh to try again." />
            ) : result.rows.length === 0 ? (
              <div className="space-y-10">
                <EmptyState
                  className="border-t-0 pt-4 md:pt-6"
                  title={active ? 'Nothing matches these filters' : 'No open projects yet'}
                  description={active ? 'Try fewer skills, a wider budget range or another category.' : 'New projects appear here as soon as clients publish them.'}
                  action={active ? { label: 'Clear filters', href: '/work' } : undefined}
                />
                {others.length > 0 && (
                  <section aria-labelledby="others-title" className="space-y-3">
                    <h2 id="others-title" className="t-section-title">Other open projects</h2>
                    <ul className="ledger">
                      {others.map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} plan={plans.get(p.id)} /></li>)}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <>
                <ul className="ledger border-t-0">
                  {result.rows.map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} plan={plans.get(p.id)} /></li>)}
                </ul>
                {pages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
                    {result.page > 1 ? <Link className="link inline-flex h-10 items-center" href={hrefWith({ page: String(result.page - 1) })}>← Previous</Link> : <span />}
                    <span className="text-ink-muted">Page {result.page} of {pages}</span>
                    {result.page < pages ? <Link className="link inline-flex h-10 items-center" href={hrefWith({ page: String(result.page + 1) })}>Next →</Link> : <span />}
                  </nav>
                )}
              </>
            )}
          </section>
        </WorkFilters>
      </form>
    </>
  );
}
