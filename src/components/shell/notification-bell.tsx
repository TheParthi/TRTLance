'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/** Unread count kept fresh by Supabase Realtime (row-level security applies to the subscription). */
export function NotificationBell({ userId, initialCount }: { userId: string; initialCount: number }) {
  const [count, setCount] = React.useState(initialCount);

  React.useEffect(() => setCount(initialCount), [initialCount]);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    const refresh = async () => {
      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (typeof c === 'number') setCount(c);
    };
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const label = count ? `Notifications, ${count} unread` : 'Notifications';
  return (
    <Link href="/notifications" aria-label={label} className="relative inline-flex size-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ink/5 hover:text-ink">
      <Bell className="size-[18px]" aria-hidden />
      {count > 0 && (
        <span className={cn('absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-2xs font-semibold leading-none text-signal-ink ring-2 ring-canvas')} aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
