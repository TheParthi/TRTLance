'use client';

import * as React from 'react';
import type { SectionId } from './nav';

const Ctx = React.createContext<{ section: SectionId | null; setSection: (s: SectionId | null) => void }>({
  section: null,
  setSection: () => undefined,
});

export function SectionProvider({ children }: { children: React.ReactNode }) {
  const [section, setSection] = React.useState<SectionId | null>(null);
  return <Ctx.Provider value={{ section, setSection }}>{children}</Ctx.Provider>;
}

export const useSectionOverride = () => React.useContext(Ctx).section;

/** Rendered by a page whose URL alone does not say which section it belongs to (e.g. a project opened from Find work). */
export function SetSection({ section }: { section: SectionId }) {
  const { setSection } = React.useContext(Ctx);
  React.useEffect(() => {
    setSection(section);
    return () => setSection(null);
  }, [section, setSection]);
  return null;
}
