/** The console's sections. One list drives the sidebar, the command palette and the breadcrumbs. */

export type ConsoleIcon =
  | 'overview' | 'queues' | 'members' | 'projects' | 'contracts' | 'disputes'
  | 'money' | 'arbitrators' | 'settings' | 'audit';

export interface ConsoleSection {
  id: string;
  href: string;
  label: string;
  /** One line explaining what the section is for; shown in the palette and as a page description. */
  summary: string;
  icon: ConsoleIcon;
  group: 'Act' | 'Platform' | 'Money' | 'Trail';
  /** Which key of the overview's queue counts to show as a badge, if any. */
  badge?: 'attention' | 'withdrawals' | 'bank_accounts' | 'applications' | 'flagged_projects';
}

export const CONSOLE_SECTIONS: ConsoleSection[] = [
  {
    id: 'overview', href: '/admin', label: 'Overview', group: 'Act', icon: 'overview',
    summary: 'How the platform is doing today, and what is waiting for the team.',
  },
  {
    id: 'queues', href: '/admin/queues', label: 'Queues', group: 'Act', icon: 'queues',
    summary: 'Disputes to assign, withdrawals to pay, bank accounts to verify, arbitrators to approve.',
    badge: 'attention',
  },
  {
    id: 'members', href: '/admin/members', label: 'Members', group: 'Platform', icon: 'members',
    summary: 'Everyone on TrustLance: find an account, read its history, suspend or reinstate it.',
  },
  {
    id: 'projects', href: '/admin/projects', label: 'Projects', group: 'Platform', icon: 'projects',
    summary: 'Every brief posted, and the ones flagged or removed by the platform team.',
    badge: 'flagged_projects',
  },
  {
    id: 'contracts', href: '/admin/contracts', label: 'Contracts', group: 'Platform', icon: 'contracts',
    summary: 'Every contract, how much is still locked in escrow, and where each one stands.',
  },
  {
    id: 'disputes', href: '/admin/disputes', label: 'Disputes', group: 'Platform', icon: 'disputes',
    summary: 'Every case, who is deciding it, and how it was settled.',
  },
  {
    id: 'money', href: '/admin/money', label: 'Money', group: 'Money', icon: 'money',
    summary: 'Where every coin sits, the platform ledger, and whether the books balance.',
  },
  {
    id: 'arbitrators', href: '/admin/arbitrators', label: 'Arbitrators', group: 'Money', icon: 'arbitrators',
    summary: 'The roster, each arbitrator’s case load, and applications waiting for review.',
    badge: 'applications',
  },
  {
    id: 'settings', href: '/admin/settings', label: 'Settings', group: 'Trail', icon: 'settings',
    summary: 'The platform fee, holds and limits, the working-day calendar, and who is an admin.',
  },
  {
    id: 'audit', href: '/admin/audit', label: 'Audit trail', group: 'Trail', icon: 'audit',
    summary: 'Every change an admin has made, in order, with who made it.',
  },
];

export const CONSOLE_GROUPS = ['Act', 'Platform', 'Money', 'Trail'] as const;

const ROOT = '/admin';

/**
 * Which section a path belongs to. A section also owns its detail pages, so /admin/members/<id>
 * belongs to Members. The overview is matched exactly: it sits at the root, so prefix matching would
 * make it claim every path under /admin, including pages that are not console sections at all (the
 * gate, for one).
 */
export function sectionFor(pathname: string): ConsoleSection | null {
  const path = pathname.replace(/\/+$/, '') || ROOT;
  return CONSOLE_SECTIONS
    .filter((s) => path === s.href || (s.href !== ROOT && path.startsWith(`${s.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function sectionsByGroup() {
  return CONSOLE_GROUPS.map((group) => ({
    group,
    sections: CONSOLE_SECTIONS.filter((s) => s.group === group),
  })).filter((g) => g.sections.length > 0);
}

/**
 * Only paths inside the console are safe to send someone to after unsealing, so an attacker cannot
 * turn ?next= into an open redirect off the site.
 */
export function safeConsolePath(next: string | undefined) {
  if (!next || !next.startsWith(ROOT)) return ROOT;
  // No protocol-relative or escaped tricks: a destination is a plain console path.
  if (next.startsWith('/admin//') || next.includes('\\') || next.includes('://')) return ROOT;
  return next === '/admin/gate' ? ROOT : next;
}
