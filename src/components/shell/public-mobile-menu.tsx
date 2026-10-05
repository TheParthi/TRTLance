'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, SheetContent } from '@/components/ui/dialog';

export function PublicMobileMenu({ links, signedIn }: { links: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <SheetContent title="Menu" side="right">
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={close} className="rounded px-3 py-3 text-base font-medium hover:bg-surface-subtle">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t p-4">
          {signedIn ? (
            <Button asChild className="w-full"><Link href="/dashboard" onClick={close}>Go to dashboard</Link></Button>
          ) : (
            <>
              <Button asChild className="w-full"><Link href="/signup" onClick={close}>Create account</Link></Button>
              <Button asChild variant="secondary" className="w-full"><Link href="/login" onClick={close}>Sign in</Link></Button>
            </>
          )}
        </div>
      </SheetContent>
    </Dialog>
  );
}
