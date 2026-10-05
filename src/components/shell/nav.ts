import type { Intent } from '@/lib/types';

export type NavIcon = 'home' | 'work' | 'projects' | 'contracts' | 'messages' | 'disputes' | 'wallet' | 'arbitration' | 'admin' | 'settings';
export type SectionId = 'home' | 'work' | 'projects' | 'contracts' | 'messages' | 'wallet';

export interface NavItem {
  id: SectionId;
  href: string;
  label: string;
  icon: NavIcon;
  /** Path patterns ('*' = one segment) that belong to this section. */
  match: string[];
}

export interface NavContext {
  intent: Intent;
  isAdmin: boolean;
  isArbitrator: boolean;
}

const home: NavItem = { id: 'home', href: '/dashboard', label: 'Home', icon: 'home', match: ['/dashboard'] };
const work: NavItem = { id: 'work', href: '/work', label: 'Find work', icon: 'work', match: ['/work', '/projects/*/apply', '/search'] };
const projects = (intent: Intent): NavItem => ({
  id: 'projects',
  href: '/projects',
  label: intent === 'work' ? 'Proposals' : 'Projects',
  icon: 'projects',
  match: ['/projects', '/projects/new', '/projects/*/edit', '/projects/*/proposals'],
});
const contracts: NavItem = { id: 'contracts', href: '/contracts', label: 'Contracts', icon: 'contracts', match: ['/contracts', '/contracts/*', '/disputes', '/disputes/*'] };
const messages: NavItem = { id: 'messages', href: '/messages', label: 'Messages', icon: 'messages', match: ['/messages', '/messages/*'] };
const wallet: NavItem = { id: 'wallet', href: '/wallet', label: 'Wallet', icon: 'wallet', match: ['/wallet'] };

/** Desktop top navigation. Wallet lives in its own chip on the right. */
export function primaryNav(ctx: NavContext): NavItem[] {
  return [home, ...(ctx.intent !== 'hire' ? [work] : []), projects(ctx.intent), contracts, messages];
}

/** Phone tab bar: five destinations, the account menu holds the rest. */
export function mobileTabs(ctx: NavContext): NavItem[] {
  return [home, ctx.intent === 'hire' ? projects(ctx.intent) : work, contracts, messages, wallet];
}

/** Items that are in the desktop bar but not in the phone tab bar (shown in the account menu on phones). */
export function overflowOnMobile(ctx: NavContext): NavItem[] {
  const tabs = new Set(mobileTabs(ctx).map((t) => t.id));
  return primaryNav(ctx).filter((i) => !tabs.has(i.id));
}

function matches(pathname: string, pattern: string) {
  const a = pathname.split('/').filter(Boolean);
  const b = pattern.split('/').filter(Boolean);
  return a.length === b.length && b.every((seg, i) => seg === '*' || seg === a[i]);
}

/** Which section the current path belongs to; pages can override it (see SetSection). */
export function sectionFor(pathname: string, items: NavItem[]): SectionId | null {
  return items.find((i) => i.match.some((p) => matches(pathname, p)))?.id ?? null;
}

export const ALL_ITEMS = (ctx: NavContext) => [home, work, projects(ctx.intent), contracts, messages, wallet];
