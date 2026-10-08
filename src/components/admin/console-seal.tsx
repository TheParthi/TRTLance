'use client';

import * as React from 'react';
import { LockKeyhole, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { sealConsole } from '@/lib/actions/admin';
import { cn } from '@/lib/utils';

/**
 * How long this console session has left, and the way out of it.
 *
 * The seal lapses on its own, so the point of showing a countdown is that nobody is surprised by it
 * mid-task: under five minutes it turns into a warning. "Leave the console" clears the seal without
 * signing out of TrustLance, which is the right move when stepping away from a shared desk.
 */
export function ConsoleSeal({ remainingMs }: { remainingMs: number }) {
  // Counted down on the client from the value the server rendered, so the clock is honest about the
  // real expiry rather than resetting on every navigation.
  const [deadline] = React.useState(() => Date.now() + remainingMs);
  const [left, setLeft] = React.useState(remainingMs);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const low = left < 5 * 60_000;
  const label = left <= 0 ? 'lapsed' : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-1">
      <Tooltip content={
        left <= 0
          ? 'This console session has lapsed. The next page will ask for your password again.'
          : `This console session lapses in ${minutes} minute${minutes === 1 ? '' : 's'} unless you keep using it.`
      }>
        <span
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium tabular-nums',
            low ? 'bg-warning-soft text-warning-strong ring-1 ring-inset ring-warning/30' : 'text-ink-muted',
          )}
        >
          <LockKeyhole className="size-3.5" aria-hidden />
          <span className="sr-only">Console session: </span>
          {label}
          {low && left > 0 && <span className="sr-only"> remaining — about to lapse</span>}
        </span>
      </Tooltip>

      <Tooltip content="Clear the console seal. You stay signed in to TrustLance.">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Leave the console"
          loading={leaving}
          onClick={() => {
            setLeaving(true);
            void sealConsole();
          }}
        >
          <LogOut />
        </Button>
      </Tooltip>
    </div>
  );
}
