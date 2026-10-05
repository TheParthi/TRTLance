'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Phones: the conversation list and the open thread are separate screens.
 * Large screens: list and thread side by side in one panel.
 */
export function MessagesFrame({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const inThread = useSelectedLayoutSegment() !== null;
  return (
    <div className="lg:grid lg:h-[calc(100dvh-8.75rem)] lg:min-h-[32rem] lg:grid-cols-[minmax(17rem,22rem)_1fr] lg:overflow-hidden lg:rounded-lg lg:border lg:bg-surface lg:shadow-xs">
      <div className={cn('lg:flex lg:min-h-0 lg:flex-col lg:border-r', inThread && 'hidden')}>{list}</div>
      <div className={cn('min-h-0 lg:flex lg:flex-col', !inThread && 'hidden')}>{children}</div>
    </div>
  );
}
