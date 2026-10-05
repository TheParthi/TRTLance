import {
  Briefcase, Compass, FileSignature, Gavel, Home, MessagesSquare, Scale, Settings, ShieldCheck, Wallet,
} from 'lucide-react';
import type { NavIcon as NavIconName } from './nav';

const map = {
  home: Home,
  work: Compass,
  projects: Briefcase,
  contracts: FileSignature,
  messages: MessagesSquare,
  disputes: Scale,
  wallet: Wallet,
  arbitration: Gavel,
  admin: ShieldCheck,
  settings: Settings,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = map[name];
  return <Icon className={className} aria-hidden />;
}
