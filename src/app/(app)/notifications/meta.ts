import {
  AlertTriangle, Bell, Briefcase, Coins, FileSignature, Flag, MessageSquare, OctagonAlert, Scale, ShieldAlert, type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationCategory, Severity } from '@/lib/types';

export const CATEGORY_META: Record<NotificationCategory, { label: string; Icon: LucideIcon }> = {
  projects: { label: 'Projects', Icon: Briefcase },
  contracts: { label: 'Contracts', Icon: FileSignature },
  milestones: { label: 'Milestones', Icon: Flag },
  payments: { label: 'Payments', Icon: Coins },
  messages: { label: 'Messages', Icon: MessageSquare },
  disputes: { label: 'Disputes', Icon: Scale },
  security: { label: 'Security', Icon: ShieldAlert },
  system: { label: 'System', Icon: Bell },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as NotificationCategory[];

/**
 * Only severities that need attention are marked (a coloured rule and an icon).
 * Info and success are the normal case and carry no chip.
 */
export const SEVERITY_META: Partial<Record<Severity, { label: string; rule: 'warning' | 'danger'; Icon: LucideIcon; icon: string }>> = {
  warning: { label: 'Needs attention', rule: 'warning', Icon: AlertTriangle, icon: 'text-warning-strong' },
  critical: { label: 'Critical', rule: 'danger', Icon: OctagonAlert, icon: 'text-danger-strong' },
};

export function isCategory(value: string | undefined | null): value is NotificationCategory {
  return Boolean(value) && CATEGORIES.includes(value as NotificationCategory);
}

/** Only same-origin relative links are followed. */
export function safeLink(link: string | null) {
  return link && link.startsWith('/') && !link.startsWith('//') ? link : null;
}

/** Calendar day of a timestamp in a time zone (the viewer's own when `timeZone` is undefined), as yyyy-mm-dd. */
export function dayKey(value: string | number | Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(new Date(value));
}

/** "Today", "Yesterday", then "3 Oct" (with the year when it is not this year). Shown in small caps. */
export function dayLabel(iso: string, timeZone?: string, now = Date.now()) {
  const key = dayKey(iso, timeZone);
  if (key === dayKey(now, timeZone)) return 'Today';
  if (key === dayKey(now - 86_400_000, timeZone)) return 'Yesterday';
  const sameYear = key.slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric', timeZone }).format(new Date(iso));
}

/** Clock time ("10:42"), 24-hour. */
export function clockTime(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date(iso));
}

export interface NotificationGroup {
  /** The newest notification of the run; its title, body and link represent the group. */
  lead: Notification;
  items: Notification[];
}

export interface NotificationDay {
  key: string;
  label: string;
  groups: NotificationGroup[];
}

/**
 * Splits a newest-first feed into days, and collapses consecutive notifications of the same
 * `type` about the same `link` into one group ("New proposal on … ×3").
 */
export function groupByDay(items: Notification[], timeZone?: string): NotificationDay[] {
  const days: NotificationDay[] = [];
  const now = Date.now();
  for (const n of items) {
    const key = dayKey(n.created_at, timeZone);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: dayLabel(n.created_at, timeZone, now), groups: [] };
      days.push(day);
    }
    const last = day.groups[day.groups.length - 1];
    if (last && last.lead.type === n.type && last.lead.link === n.link) last.items.push(n);
    else day.groups.push({ lead: n, items: [n] });
  }
  return days;
}
