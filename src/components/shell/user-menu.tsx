'use client';

import Link from 'next/link';
import { Gavel, LogOut, Settings, ShieldCheck, User, Wallet } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { overflowOnMobile, type NavContext } from './nav';
import { NavIcon } from './nav-icon';
import { ThemeMenuItems } from './theme-toggle';

export function UserMenu({ name, username, avatarPath, email, ctx }: {
  name: string;
  username: string;
  avatarPath: string | null;
  email: string | null;
  ctx: NavContext;
}) {
  const extra = overflowOnMobile(ctx);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Account menu">
        <Avatar name={name} path={avatarPath} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          {email && <span className="block truncate">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {extra.length > 0 && (
          <div className="lg:hidden">
            {extra.map((i) => (
              <DropdownMenuItem key={i.id} asChild>
                <Link href={i.href}><NavIcon name={i.icon} /> {i.label}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        )}
        <DropdownMenuItem asChild><Link href={`/u/${username}`}><User /> Public profile</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/wallet"><Wallet /> Wallet</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/settings"><Settings /> Settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/arbitration"><Gavel /> {ctx.isArbitrator ? 'Arbitration' : 'Become an arbitrator'}</Link>
        </DropdownMenuItem>
        {ctx.isAdmin && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck /> Admin</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full"><LogOut /> Sign out</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
