'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Phones: the conversation list and the open thread are separate screens.
 * Large screens: list and thread side by side, split by a single rule (no outer box).
 */
export function MessagesFrame({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const inThread = useSelectedLayoutSegment() !== null;
  return (
    <div className="min-w-0 lg:grid lg:h-[calc(100dvh-8.75rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)] lg:overflow-hidden">
      <div className={cn('min-w-0 lg:flex lg:min-h-0 lg:flex-col lg:pr-6', inThread && 'hidden')}>{list}</div>
      <div className={cn('min-h-0 min-w-0 lg:flex lg:flex-col lg:border-l lg:pl-6', !inThread && 'hidden')}>{children}</div>
    </div>
  );
}
