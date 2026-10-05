import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, mobileTabs, overflowOnMobile, primaryNav, sectionFor } from './nav';

const ctx = (intent: 'hire' | 'work' | 'both') => ({ intent, isAdmin: false, isArbitrator: false });

describe('navigation', () => {
  it('maps paths to sections, leaving ambiguous project pages to the page itself', () => {
    const items = ALL_ITEMS(ctx('both'));
    expect(sectionFor('/dashboard', items)).toBe('home');
    expect(sectionFor('/disputes/abc', items)).toBe('contracts');
    expect(sectionFor('/projects/abc/apply', items)).toBe('work');
    expect(sectionFor('/projects/abc/proposals', items)).toBe('projects');
    expect(sectionFor('/projects/abc', items)).toBeNull();
    expect(sectionFor('/contracts/abc', items)).toBe('contracts');
  });

  it('adapts to what the member came to do', () => {
    expect(primaryNav(ctx('hire')).map((i) => i.label)).toEqual(['Home', 'Projects', 'Contracts', 'Messages']);
    expect(primaryNav(ctx('work')).map((i) => i.label)).toEqual(['Home', 'Find work', 'Proposals', 'Contracts', 'Messages']);
    expect(mobileTabs(ctx('both')).map((i) => i.id)).toEqual(['home', 'work', 'contracts', 'messages', 'wallet']);
    expect(overflowOnMobile(ctx('both')).map((i) => i.id)).toEqual(['projects']);
  });
});
