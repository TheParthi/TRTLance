'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FieldContext {
  id: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
}

const Ctx = React.createContext<FieldContext | null>(null);

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}

/** Label + control + hint + error, wired together for assistive technology. */
export function Field({ label, hint, error, optional, className, hideLabel, children }: FieldProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = React.cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
  });
  return (
    <Ctx.Provider value={{ id, hintId, errorId, invalid: Boolean(error) }}>
      <div className={cn('space-y-1.5', className)}>
        <label htmlFor={id} className={cn('flex items-baseline justify-between gap-2 t-label', hideLabel && 'sr-only')}>
          <span>{label}</span>
          {optional && <span className="text-xs font-normal text-ink-muted">Optional</span>}
        </label>
        {control}
        {hint && !error && (
          <p id={hintId} className="text-xs text-ink-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-danger-strong" role="alert">
            {error}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function FieldGroup({ legend, hint, error, children, className }: {
  legend: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-2', className)}>
      <legend className="t-label">{legend}</legend>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs font-medium text-danger-strong" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
