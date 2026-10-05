import {
  Bell, Briefcase, Coins, FileSignature, Flag, MessageSquare, Scale, ShieldAlert, type LucideIcon,
} from 'lucide-react';
import type { NotificationCategory, Severity } from '@/lib/types';
import type { Tone } from '@/lib/status';

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

export const SEVERITY_META: Record<Severity, { label: string; tone: Tone; icon: string }> = {
  info: { label: 'Info', tone: 'info', icon: 'bg-info-soft text-info-strong' },
  success: { label: 'Success', tone: 'success', icon: 'bg-success-soft text-success-strong' },
  warning: { label: 'Needs attention', tone: 'warning', icon: 'bg-warning-soft text-warning-strong' },
  critical: { label: 'Critical', tone: 'danger', icon: 'bg-danger-soft text-danger-strong' },
};

export function isCategory(value: string | undefined | null): value is NotificationCategory {
  return Boolean(value) && CATEGORIES.includes(value as NotificationCategory);
}

/** Only same-origin relative links are followed. */
export function safeLink(link: string | null) {
  return link && link.startsWith('/') && !link.startsWith('//') ? link : null;
}
