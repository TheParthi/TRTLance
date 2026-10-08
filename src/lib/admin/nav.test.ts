import { describe, expect, it } from 'vitest';
import { CONSOLE_GROUPS, CONSOLE_SECTIONS, safeConsolePath, sectionFor, sectionsByGroup } from './nav';

describe('console sections', () => {
  it('has a unique id and href for each section', () => {
    expect(new Set(CONSOLE_SECTIONS.map((s) => s.id)).size).toBe(CONSOLE_SECTIONS.length);
    expect(new Set(CONSOLE_SECTIONS.map((s) => s.href)).size).toBe(CONSOLE_SECTIONS.length);
  });

  it('keeps every section inside /admin and in a known group', () => {
    for (const section of CONSOLE_SECTIONS) {
      expect(section.href === '/admin' || section.href.startsWith('/admin/')).toBe(true);
      expect(CONSOLE_GROUPS).toContain(section.group);
      expect(section.summary.length).toBeGreaterThan(20);
    }
  });

  it('matches a section page and its detail pages', () => {
    expect(sectionFor('/admin')?.id).toBe('overview');
    expect(sectionFor('/admin/')?.id).toBe('overview');
    expect(sectionFor('/admin/members')?.id).toBe('members');
    expect(sectionFor('/admin/members/11111111-1111-1111-1111-111111111111')?.id).toBe('members');
    expect(sectionFor('/admin/contracts/abc')?.id).toBe('contracts');
    expect(sectionFor('/admin/money')?.id).toBe('money');
  });

  it('does not let the overview swallow the sections beneath it', () => {
    for (const section of CONSOLE_SECTIONS.filter((s) => s.href !== '/admin')) {
      expect(sectionFor(section.href)?.id).toBe(section.id);
    }
  });

  it('matches nothing outside the console, including a lookalike path', () => {
    expect(sectionFor('/dashboard')).toBeNull();
    expect(sectionFor('/admin/gate')).toBeNull();
    expect(sectionFor('/administration')).toBeNull();
    expect(sectionFor('/admins')).toBeNull();
  });

  it('groups every section exactly once, in order', () => {
    const grouped = sectionsByGroup();
    expect(grouped.flatMap((g) => g.sections)).toHaveLength(CONSOLE_SECTIONS.length);
    expect(grouped.map((g) => g.group)).toEqual(CONSOLE_GROUPS.filter(
      (group) => CONSOLE_SECTIONS.some((s) => s.group === group),
    ));
  });
});


describe('where the gate may send someone after unsealing', () => {
  it('keeps a console path, including a detail page and a query', () => {
    expect(safeConsolePath('/admin/members')).toBe('/admin/members');
    expect(safeConsolePath('/admin/members/11111111-1111-1111-1111-111111111111')).toBe('/admin/members/11111111-1111-1111-1111-111111111111');
    expect(safeConsolePath('/admin/money?kind=release')).toBe('/admin/money?kind=release');
  });

  it('falls back to the overview when there is nothing useful to go to', () => {
    expect(safeConsolePath(undefined)).toBe('/admin');
    expect(safeConsolePath('')).toBe('/admin');
    expect(safeConsolePath('/admin/gate')).toBe('/admin');
  });

  it('refuses to be used as an open redirect', () => {
    expect(safeConsolePath('/dashboard')).toBe('/admin');
    expect(safeConsolePath('https://evil.example/admin')).toBe('/admin');
    expect(safeConsolePath('//evil.example')).toBe('/admin');
    expect(safeConsolePath('/admin//evil.example')).toBe('/admin');
    expect(safeConsolePath('/admin\\evil.example')).toBe('/admin');
    expect(safeConsolePath('javascript:alert(1)')).toBe('/admin');
  });
});
