import type { Intent } from '@/lib/types';

export type NavIcon = 'home' | 'work' | 'projects' | 'contracts' | 'messages' | 'disputes' | 'wallet' | 'arbitration' | 'admin' | 'settings';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Other path prefixes that count as this section. */
  match?: string[];
}

export interface NavContext {
  intent: Intent;
  isAdmin: boolean;
  isArbitrator: boolean;
}

export function primaryNav(ctx: NavContext): NavItem[] {
  const items: NavItem[] = [{ href: '/dashboard', label: 'Home', icon: 'home' }];
  if (ctx.intent !== 'hire') items.push({ href: '/work', label: 'Find work', icon: 'work' });
  items.push(
    { href: '/projects', label: ctx.intent === 'work' ? 'Proposals' : 'Projects', icon: 'projects' },
    { href: '/contracts', label: 'Contracts', icon: 'contracts' },
    { href: '/messages', label: 'Messages', icon: 'messages' },
    { href: '/disputes', label: 'Disputes', icon: 'disputes' },
    { href: '/wallet', label: 'Wallet', icon: 'wallet' },
  );
  return items;
}

export function secondaryNav(ctx: NavContext): NavItem[] {
  const items: NavItem[] = [{ href: '/arbitration', label: ctx.isArbitrator ? 'Arbitration' : 'Become an arbitrator', icon: 'arbitration' }];
  if (ctx.isAdmin) items.push({ href: '/admin', label: 'Admin', icon: 'admin' });
  items.push({ href: '/settings', label: 'Settings', icon: 'settings' });
  return items;
}

/** Four destinations for the phone tab bar; everything else lives in the "More" sheet. */
export function mobileTabs(ctx: NavContext): NavItem[] {
  return [
    { href: '/dashboard', label: 'Home', icon: 'home' },
    ctx.intent === 'hire'
      ? { href: '/projects', label: 'Projects', icon: 'projects' }
      : { href: '/work', label: 'Find work', icon: 'work' },
    { href: '/contracts', label: 'Contracts', icon: 'contracts' },
    { href: '/messages', label: 'Messages', icon: 'messages' },
  ];
}

export function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
