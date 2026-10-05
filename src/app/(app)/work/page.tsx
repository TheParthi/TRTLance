import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState } from '@/components/common/states';
import { ProjectCard } from '@/components/projects/project-card';
import { getCategories, PAGE_SIZE, searchProjects, type ProjectFilters } from '@/lib/data/projects';
import { getViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Find work' };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

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
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const active = [filters.q, filters.category, filters.skills?.length, filters.min, filters.max, filters.experience].filter(Boolean).length;
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => k !== 'page' && one(v) && params.set(k, one(v)));
    params.set('page', String(p));
    return `/work?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Find work"
        description="Open projects from clients on TrustLance. Each contract is funded in escrow before work starts."
        actions={viewer?.profile.intent !== 'work' && viewer ? <Button asChild variant="secondary"><Link href="/projects/new">Post a project</Link></Button> : undefined}
      />
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Filters">
          <details className="group panel lg:hidden" open={active > 0 ? true : undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold">
              <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden /> Filters {active > 0 && `(${active})`}</span>
              <span className="text-ink-muted group-open:rotate-180" aria-hidden>▾</span>
            </summary>
            <FilterForm filters={filters} categories={categories} idPrefix="m" />
          </details>
          <div className="panel sticky top-20 hidden lg:block">
            <FilterForm filters={filters} categories={categories} idPrefix="d" />
          </div>
        </aside>
        <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="results-heading" className="text-sm text-ink-secondary" aria-live="polite">
              {result ? `${result.total} open project${result.total === 1 ? '' : 's'}${filters.q ? ` matching “${filters.q}”` : ''}` : 'Results'}
            </h2>
            {active > 0 && <Link href="/work" className="text-sm link">Clear filters</Link>}
          </div>
          {!result ? (
            <ErrorState description="Projects could not be loaded right now. Your filters are kept in the address bar — refresh to try again." />
          ) : result.rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={active ? 'No projects match these filters' : 'No open projects yet'}
              description={active ? 'Try fewer skills, a wider budget range or another category.' : 'New projects appear here as soon as clients publish them.'}
              action={active ? { label: 'Clear filters', href: '/work' } : undefined}
            />
          ) : (
            <>
              <ul className="space-y-4">
                {result.rows.map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} /></li>)}
              </ul>
              {pages > 1 && (
                <nav aria-label="Pagination" className="flex items-center justify-between pt-2 text-sm">
                  {result.page > 1 ? <Link className="link" href={pageHref(result.page - 1)}>← Previous</Link> : <span />}
                  <span className="text-ink-muted">Page {result.page} of {pages}</span>
                  {result.page < pages ? <Link className="link" href={pageHref(result.page + 1)}>Next →</Link> : <span />}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

function FilterForm({ filters, categories, idPrefix }: { filters: ProjectFilters; categories: { slug: string; label: string }[]; idPrefix: string }) {
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <form action="/work" className={`space-y-4 p-4 ${idPrefix === 'm' ? 'border-t' : ''}`}>
      <div className="space-y-1.5">
        <label htmlFor={id('q')} className="t-label">Keywords</label>
        <Input id={id('q')} name="q" type="search" defaultValue={filters.q} placeholder="e.g. landing page" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id('cat')} className="t-label">Category</label>
        <Select id={id('cat')} name="category" defaultValue={filters.category}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id('skills')} className="t-label">Skills</label>
        <Input id={id('skills')} name="skills" defaultValue={filters.skills?.join(', ')} placeholder="react, figma" aria-describedby={id('skills-hint')} />
        <p id={id('skills-hint')} className="t-meta">Comma separated. Matches any.</p>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="t-label">Budget (SHM)</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min" inputMode="decimal" defaultValue={filters.min} placeholder="Min" aria-label="Minimum budget" />
          <Input name="max" inputMode="decimal" defaultValue={filters.max} placeholder="Max" aria-label="Maximum budget" />
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={id('exp')} className="t-label">Experience</label>
        <Select id={id('exp')} name="experience" defaultValue={filters.experience}>
          <option value="">Any level</option>
          <option value="entry">Entry level</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={id('sort')} className="t-label">Sort by</label>
        <Select id={id('sort')} name="sort" defaultValue={filters.sort || 'newest'}>
          <option value="newest">Newest</option>
          <option value="relevance">Best match</option>
          <option value="budget_high">Highest budget</option>
          <option value="budget_low">Lowest budget</option>
          <option value="fewest_proposals">Fewest proposals</option>
        </Select>
      </div>
      <Button type="submit" className="w-full">Apply filters</Button>
    </form>
  );
}
