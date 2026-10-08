import {
  BookLock, Briefcase, Coins, FileSignature, Gauge, Inbox, Scale, Settings2, Users, Gavel,
  type LucideIcon,
} from 'lucide-react';
import type { ConsoleIcon as Name } from '@/lib/admin/nav';

const icons: Record<Name, LucideIcon> = {
  overview: Gauge,
  queues: Inbox,
  members: Users,
  projects: Briefcase,
  contracts: FileSignature,
  disputes: Scale,
  money: Coins,
  arbitrators: Gavel,
  settings: Settings2,
  audit: BookLock,
};

export function ConsoleIcon({ name, className }: { name: Name; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden />;
}
