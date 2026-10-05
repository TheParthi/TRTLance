'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { controlClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Free-form list input (skills, languages). Enter or comma adds; Backspace removes the last item. */
export function TagInput({ id, value, onChange, max = 15, placeholder, suggestions = [], ...aria }: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  suggestions?: string[];
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const [draft, setDraft] = React.useState('');
  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().slice(0, 40);
    if (!tag || value.includes(tag) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !value.includes(s)).slice(0, 8);
  return (
    <div className="space-y-2">
      <div className={cn(controlClass, 'flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-focus/40')}>
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded bg-surface-sunken px-2 py-0.5 text-xs font-medium">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="rounded text-ink-muted hover:text-ink">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length >= max ? `Maximum of ${max}` : placeholder}
          disabled={value.length >= max}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-ink-muted/80"
          {...aria}
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {remaining.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed px-2.5 py-0.5 text-xs text-ink-secondary hover:border-brand hover:text-brand">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
