'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { CURRENCY } from '@/lib/env';
import { cn } from '@/lib/utils';

export interface WorkFilterValues {
  q: string;
  category: string;
  skills: string;
  min: string;
  max: string;
  experience: string;
  /** The order shown in the Sort control. */
  sort: string;
  /** Whether the order came from the URL; otherwise it is left out so the server default applies (best match when searching). */
  sortChosen: boolean;
}

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'relevance', label: 'Best match' },
  { value: 'budget_high', label: 'Highest budget' },
  { value: 'budget_low', label: 'Lowest budget' },
  { value: 'fewest_proposals', label: 'Fewest proposals' },
];

/**
 * Find work's refining controls. A compact toolbar (results line, Filters, Sort) sits above the results;
 * "Filters" opens a column beside the results on desktop and a bottom sheet on phones.
 * Must be rendered inside the page's GET form (`formId`): the column's fields belong to it even while
 * hidden, so a new search keeps the current filters. The sheet is its own form that carries the rest along.
 */
export function WorkFilters({ formId, values, count, initialOpen, summary, children }: {
  formId: string;
  values: WorkFilterValues;
  count: number;
  initialOpen: boolean;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  const [sheet, setSheet] = React.useState(false);
  const [q, setQ] = React.useState(values.q);
  const badge = count > 0 && (
    <span className="rounded-full bg-ink px-1.5 text-2xs tabular-nums text-ink-inverse">{count}<span className="sr-only"> active</span></span>
  );
  const openSheet = () => {
    // Carry an edited (not yet submitted) search into the sheet's form.
    const field = document.getElementById(`${formId}-q`) as HTMLInputElement | null;
    setQ(field?.value ?? values.q);
    setSheet(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-3">
        <div className="min-w-0">{summary}</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" className="h-10 lg:hidden" aria-haspopup="dialog" onClick={openSheet}>
            <SlidersHorizontal /> Filters {badge}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="hidden lg:inline-flex" aria-expanded={open} aria-controls={`${formId}-column`} onClick={() => setOpen((o) => !o)}>
            <SlidersHorizontal /> {open ? 'Hide filters' : 'Filters'} {badge}
          </Button>
          <label htmlFor={`${formId}-sort`} className="sr-only">Sort by</label>
          <Select
            id={`${formId}-sort`}
            name={values.sortChosen ? 'sort' : undefined}
            defaultValue={values.sort}
            className="h-10 w-auto text-sm lg:h-8"
            onChange={(e) => {
              e.currentTarget.name = 'sort';
              e.currentTarget.form?.requestSubmit();
            }}
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-10', open && 'lg:grid-cols-[13rem_minmax(0,1fr)]')}>
        <aside id={`${formId}-column`} aria-label="Filters" className={cn('hidden min-w-0 pt-2', open && 'lg:block')}>
          <div className="lg:sticky lg:top-20">
            <FilterFields prefix={`${formId}-d`} values={values} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Narrow the open projects by skill, budget and experience.</DialogDescription>
          </DialogHeader>
          <form action="/work">
            {q && <input type="hidden" name="q" value={q} />}
            {values.category && <input type="hidden" name="category" value={values.category} />}
            {values.sortChosen && <input type="hidden" name="sort" value={values.sort} />}
            <FilterFields prefix={`${formId}-m`} values={values} />
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterFields({ prefix, values }: { prefix: string; values: WorkFilterValues }) {
  const id = (n: string) => `${prefix}-${n}`;
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor={id('skills')} className="t-label">Skills</label>
        <Input id={id('skills')} name="skills" defaultValue={values.skills} placeholder="react, figma" aria-describedby={id('skills-hint')} />
        <p id={id('skills-hint')} className="t-meta">Comma separated. Matches any.</p>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="t-label">Budget ({CURRENCY})</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min" inputMode="decimal" defaultValue={values.min} placeholder="Min" aria-label="Minimum budget" />
          <Input name="max" inputMode="decimal" defaultValue={values.max} placeholder="Max" aria-label="Maximum budget" />
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor={id('exp')} className="t-label">Experience</label>
        <Select id={id('exp')} name="experience" defaultValue={values.experience}>
          <option value="">Any level</option>
          <option value="entry">Entry level</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </Select>
      </div>
      <Button type="submit" variant="secondary" className="w-full">Apply filters</Button>
    </div>
  );
}
