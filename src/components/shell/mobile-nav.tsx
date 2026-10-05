'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, SheetContent } from '@/components/ui/dialog';
import { isActive, mobileTabs, primaryNav, secondaryNav, type NavContext } from './nav';
import { NavIcon } from './nav-icon';
import { NavList } from './side-nav';

export function MobileNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const tabs = mobileTabs(ctx);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur safe-bottom lg:hidden">
      <ul className="grid h-bottombar grid-cols-5">
        {tabs.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-1 text-2xs font-medium', active ? 'text-brand' : 'text-ink-muted')}
              >
                <NavIcon name={item.icon} className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="flex h-full w-full flex-col items-center justify-center gap-1 text-2xs font-medium text-ink-muted">
              <Menu className="size-5" aria-hidden />
              More
            </DialogTrigger>
            <SheetContent title="Menu" side="right">
              <nav aria-label="All sections" className="space-y-4 p-3">
                <NavList items={primaryNav(ctx)} onNavigate={() => setOpen(false)} />
                <div className="border-t pt-3">
                  <NavList items={secondaryNav(ctx)} onNavigate={() => setOpen(false)} />
                </div>
              </nav>
            </SheetContent>
          </Dialog>
        </li>
      </ul>
    </nav>
  );
}
