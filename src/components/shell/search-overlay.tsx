'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight, Search, X } from 'lucide-react';

/** Search as a full-screen moment: one large field for projects, skills or people. Press / to open. */
export function SearchOverlay() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !open && !t.closest('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search');
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger aria-label="Search" className="inline-flex size-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink">
        <Search className="size-[18px]" aria-hidden />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-x-0 top-0 z-50 mx-auto max-w-content px-4 pt-24 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-4 data-[state=open]:fade-in-0 md:px-6 md:pt-32">
          <DialogPrimitive.Title className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Search TrustLance</DialogPrimitive.Title>
          <form onSubmit={submit} role="search" className="mt-4 flex items-center gap-4 border-b-2 border-ink pb-3">
            <Search className="size-7 shrink-0 text-ink-muted" aria-hidden />
            <label htmlFor="overlay-search" className="sr-only">Search projects, skills or people</label>
            <input
              id="overlay-search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Projects, skills or people"
              className="min-w-0 flex-1 bg-transparent font-display text-[clamp(1.8rem,4.5vw,3.5rem)] leading-tight tracking-[-0.02em] outline-none placeholder:text-ink-muted/60"
            />
            <button type="submit" aria-label="Search" className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-transform hover:scale-105">
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
          <p className="mt-3 text-sm text-ink-muted">Press Enter to search · Esc to close</p>
          <DialogPrimitive.Close aria-label="Close search" className="absolute right-4 top-6 inline-flex size-11 items-center justify-center rounded-full border border-ink/15 md:right-6">
            <X className="size-5" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
