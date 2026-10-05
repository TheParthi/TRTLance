import {
  AlertTriangle, Archive, Ban, Check, CheckCheck, CircleDashed, Clock, Coins, Eye, Flag, Loader2, Lock, PenLine, Play,
  Scale, Send, Undo2, Upload, Wallet, X, type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@/lib/status';

const icons: Record<IconName, LucideIcon> = {
  'circle-dashed': CircleDashed,
  lock: Lock,
  upload: Upload,
  eye: Eye,
  check: Check,
  'check-check': CheckCheck,
  coins: Coins,
  alert: AlertTriangle,
  undo: Undo2,
  scale: Scale,
  pen: PenLine,
  wallet: Wallet,
  play: Play,
  ban: Ban,
  flag: Flag,
  clock: Clock,
  x: X,
  send: Send,
  archive: Archive,
  loader: Loader2,
};

export function StatusIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = icons[name];
  return <Icon className={[className, name === 'loader' ? 'animate-spin' : ''].join(' ')} aria-hidden />;
}
