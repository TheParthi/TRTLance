'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, controlClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * List filters that live in the URL.
 *
 * Every list in the console is server-rendered from its search parameters, which means a filtered
 * view can be bookmarked, shared with a colleague and reloaded without losing where you were — and
 * the back button does what it should. Nothing is held in client state, so there is no second copy
 * of the truth to drift.
 */

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return React.useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    // Any change to a filter starts again from the first page.
    if (!('page' in changes)) next.delete('page');
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [params, pathname, router]);
}

export interface FilterSelect {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function FilterBar({ searchName = 'q', searchLabel, selects = [], children }: {
  searchName?: string;
  /** What the search box looks through, e.g. "Search by name or username". */
  searchLabel?: string;
  selects?: FilterSelect[];
  children?: React.ReactNode;
}) {
  const params = useSearchParams();
  const navigate = useFilterNav();
  const [term, setTerm] = React.useState(params.get(searchName) ?? '');
  const searchId = React.useId();

  // Keep the box in step when the URL changes from somewhere else (a cleared filter, the back button).
  const current = params.get(searchName) ?? '';
  React.useEffect(() => setTerm(current), [current]);

  const active = [...params.keys()].some((key) => key !== 'page');

  return (
    <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end">
      {searchLabel && (
        <form
          className="min-w-0 flex-1 space-y-1.5"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ [searchName]: term.trim() || null });
          }}
        >
          <label htmlFor={searchId} className="t-label-caps">{searchLabel}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id={searchId}
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={searchLabel}
              className={cn(controlClass, 'h-10 pl-9 pr-3')}
            />
          </div>
        </form>
      )}

      {selects.map((select) => (
        <div key={select.name} className="space-y-1.5">
          <label htmlFor={`filter-${select.name}`} className="t-label-caps">{select.label}</label>
          <Select
            id={`filter-${select.name}`}
            value={params.get(select.name) ?? select.options[0]?.value ?? ''}
            onChange={(e) => navigate({ [select.name]: e.target.value })}
            className="md:w-44"
          >
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      ))}

      {children}

      {active && (
        <Button variant="ghost" size="sm" onClick={() => navigate(Object.fromEntries([...params.keys()].map((k) => [k, null])))}>
          <X /> Clear
        </Button>
      )}
    </div>
  );
}
