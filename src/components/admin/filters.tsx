'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { controlClass } from '@/components/ui/input';
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

  const active = [...params.keys()].filter((key) => key !== 'page');

  return (
    <div className="console-card flex flex-wrap items-center gap-2 p-2">
      {searchLabel && (
        <form
          className="min-w-0 flex-1 basis-full sm:basis-56"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ [searchName]: term.trim() || null });
          }}
        >
          <label htmlFor={searchId} className="sr-only">{searchLabel}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              id={searchId}
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={searchLabel}
              className={cn(controlClass, 'h-9 border-transparent bg-surface-subtle pl-9 pr-3 shadow-none')}
            />
          </div>
        </form>
      )}

      {/*
        Each control labels itself with its current value ("Status: Open"), so the row needs no
        separate label column — which is what made the old bar collide with itself — and a glance
        tells you what is filtered without reading a legend.
      */}
      {selects.map((select) => {
        const value = params.get(select.name) ?? select.options[0]?.value ?? '';
        const chosen = select.options.find((o) => o.value === value) ?? select.options[0];
        const narrowed = Boolean(params.get(select.name));
        return (
          /*
           * A <select> is as wide as its widest option, and nothing in a flex row can shrink it
           * below that — long options like "Show: Not finished onboarding" pushed the whole page
           * sideways on a phone. Full width on a narrow screen, intrinsic from sm up.
           */
          <div key={select.name} className="relative min-w-0 flex-1 sm:flex-none">
            <label htmlFor={`filter-${select.name}`} className="sr-only">{select.label}</label>
            <select
              id={`filter-${select.name}`}
              value={value}
              onChange={(e) => navigate({ [select.name]: e.target.value })}
              className={cn(
                controlClass,
                'h-9 w-full appearance-none bg-[length:16px] bg-[right_0.55rem_center] bg-no-repeat pl-3 pr-8 text-sm shadow-none sm:w-auto',
                "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a9499' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
                narrowed
                  ? 'border-brand/40 bg-brand-soft text-brand-strong'
                  : 'border-transparent bg-surface-subtle text-ink-secondary',
              )}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {select.label}: {option.label}
                </option>
              ))}
            </select>
            <span className="sr-only">{chosen?.label}</span>
          </div>
        );
      })}

      {children}

      {active.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => navigate(Object.fromEntries(active.map((k) => [k, null])))}
        >
          <X /> Clear {active.length > 1 ? `${active.length} filters` : 'filter'}
        </Button>
      )}
    </div>
  );
}
