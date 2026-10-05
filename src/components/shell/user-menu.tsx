'use client';

import Link from 'next/link';
import { LogOut, Settings, User, Wallet } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeMenuItems } from './theme-toggle';

export function UserMenu({ name, username, avatarPath, email }: { name: string; username: string; avatarPath: string | null; email: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Account menu">
        <Avatar name={name} path={avatarPath} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          {email && <span className="block truncate">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${username}`}><User /> Public profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wallet"><Wallet /> Wallet</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings /> Settings</Link>
        </DropdownMenuItem>
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
