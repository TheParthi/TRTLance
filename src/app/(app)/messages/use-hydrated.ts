'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. Used for times shown in the
 * viewer's own timezone, which the server cannot know.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
