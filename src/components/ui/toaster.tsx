'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-line bg-surface text-ink shadow-md text-sm',
          description: 'text-ink-secondary',
          error: 'border-danger/30',
          success: 'border-success/30',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
