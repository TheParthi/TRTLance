'use client';

import * as React from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowUpRight, X } from 'lucide-react';

/** Phones: a full-screen menu with oversized links that rise in one after another. */
export function PublicMobileMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  const all = [...links, ...(signedIn ? [{ href: '/dashboard', label: 'Dashboard' }] : [{ href: '/login', label: 'Sign in' }])];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label="Open menu"
        className="ml-auto inline-flex size-11 flex-col items-center justify-center gap-1.5 rounded-full border border-current md:hidden"
      >
        <span className="h-px w-4 bg-current" />
        <span className="h-px w-4 bg-current" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col bg-canvas data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
          <div className="container flex h-[4.5rem] items-center justify-between">
            <span className="t-label-caps">Menu</span>
            <DialogPrimitive.Close aria-label="Close menu" className="inline-flex size-11 items-center justify-center rounded-full border border-ink/20">
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <nav aria-label="Main" className="container flex flex-1 flex-col justify-center">
            <ul className="border-t border-ink/15">
              {all.map((l, i) => (
                <li key={l.href} className="overflow-hidden border-b border-ink/15">
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex animate-word-up items-center justify-between py-5 font-display text-[2.6rem] leading-none tracking-[-0.03em]"
                    style={{ animationDelay: `${80 + i * 70}ms` }}
                  >
                    {l.label}
                    <ArrowUpRight className="size-7 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="container pb-8">
            <Link
              href={signedIn ? '/dashboard' : '/signup'}
              onClick={close}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-signal text-base font-semibold text-signal-ink"
            >
              {signedIn ? 'Go to dashboard' : 'Create account'} <ArrowUpRight className="size-5" aria-hidden />
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
