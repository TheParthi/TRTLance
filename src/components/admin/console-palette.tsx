'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CONSOLE_SECTIONS } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';
import { ConsoleIcon } from './console-icon';

/**
 * Jump to a section, or straight to a member, contract or project by id.
 *
 * A console is used all day by a handful of people, so the fastest route to anything should be the
 * keyboard. Typing filters the sections; pasting an id offers the detail page for it directly, which
 * is how most support work actually starts — with an id from a ticket.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Choice {
  key: string;
  label: string;
  summary: string;
  href: string;
  icon: React.ReactNode;
}

export function ConsolePalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const listId = React.useId();

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((was) => !was);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const query = term.trim();
  const choices = React.useMemo<Choice[]>(() => {
    const sections = CONSOLE_SECTIONS
      .filter((s) => !query || `${s.label} ${s.summary} ${s.group}`.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({
        key: s.id,
        label: s.label,
        summary: s.summary,
        href: s.href,
        icon: <ConsoleIcon name={s.icon} className="size-4" />,
      }));

    if (!UUID.test(query)) return sections;
    // An id could be any of three things, so offer all three rather than guessing.
    const byId: Choice[] = [
      { key: 'member', label: 'Open this member', summary: query, href: `/admin/members/${query}`, icon: <ConsoleIcon name="members" className="size-4" /> },
      { key: 'contract', label: 'Open this contract', summary: query, href: `/admin/contracts/${query}`, icon: <ConsoleIcon name="contracts" className="size-4" /> },
      { key: 'project', label: 'Find this project', summary: query, href: `/admin/projects?q=${query}`, icon: <ConsoleIcon name="projects" className="size-4" /> },
    ];
    return [...byId, ...sections];
  }, [query]);

  React.useEffect(() => setCursor(0), [query]);

  const go = (choice: Choice | undefined) => {
    if (!choice) return;
    setOpen(false);
    setTerm('');
    router.push(choice.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-full border border-ink/15 px-3 text-sm text-ink-muted transition-colors duration-base ease-ledger hover:border-ink/30 hover:text-ink"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Jump to…</span>
        <kbd className="hidden rounded border border-ink/15 px-1 font-sans text-2xs font-medium sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md" hideClose className="p-0">
          <DialogTitle className="sr-only">Jump to a section or paste an id</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
            {/* A combobox: the input keeps focus and the arrow keys move a cursor through the list. */}
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Jump to a section, or paste a member or contract id"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={choices[cursor] ? `${listId}-${choices[cursor].key}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setCursor((c) => (c + 1) % Math.max(choices.length, 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setCursor((c) => (c - 1 + choices.length) % Math.max(choices.length, 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  go(choices[cursor]);
                }
              }}
            />
          </div>

          <ul id={listId} role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-1.5">
            {choices.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-muted">Nothing matches “{query}”.</li>}
            {choices.map((choice, i) => (
              <li key={choice.key} id={`${listId}-${choice.key}`} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(choice)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded px-2.5 py-2 text-left transition-colors duration-fast',
                    i === cursor ? 'bg-surface-subtle' : 'hover:bg-surface-subtle/60',
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-ink-muted">{choice.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{choice.label}</span>
                    <span className="block truncate text-xs text-ink-muted">{choice.summary}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
