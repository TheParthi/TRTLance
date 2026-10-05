'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const subscribe = () => () => undefined;

/**
 * The page's one action, pinned to the bottom of the screen below `lg` (above the tab bar when there is one).
 * Rendered into <body> so no transformed ancestor (e.g. a page transition) can break `position: fixed`.
 * Pair it with the same action rendered inline from `lg` up.
 */
export function MobileActionBar({ children, aboveTabBar }: { children: React.ReactNode; aboveTabBar: boolean }) {
  const mounted = React.useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div
      className={cn(
        'fixed inset-x-0 z-30 border-t bg-canvas/95 px-4 py-3 backdrop-blur lg:hidden',
        aboveTabBar ? 'bottom-[calc(theme(spacing.bottombar)+env(safe-area-inset-bottom))]' : 'safe-bottom bottom-0',
      )}
    >
      <div className="mx-auto flex max-w-xl items-center gap-4">{children}</div>
    </div>,
    document.body,
  );
}
