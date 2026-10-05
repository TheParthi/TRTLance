import { formatDate } from '@/lib/format';

/** A project's timeline in words: "Due 15 Dec 2026", "Starts 1 Nov 2026 · due 15 Dec 2026" or "Flexible". */
export function timelineText(start: string | null | undefined, due: string | null | undefined) {
  if (start && due) return `Starts ${formatDate(start)} · due ${formatDate(due)}`;
  if (due) return `Due ${formatDate(due)}`;
  if (start) return `Starts ${formatDate(start)}`;
  return 'Flexible';
}
