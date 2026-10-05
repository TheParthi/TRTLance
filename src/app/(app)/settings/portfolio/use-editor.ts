'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import type { FieldErrors, SectionResult } from '@/lib/actions/profile-sections';

/** State for an add/edit dialog backed by a profile-section server action. */
export function useEditor<T extends Record<string, string>>(empty: T, save: (id: string | null, values: T) => Promise<SectionResult>) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [id, setId] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<T>(empty);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const start = (editId: string | null, initial: T) => {
    setId(editId);
    setValues(initial);
    setErrors({});
    setError(null);
    setOpen(true);
  };

  const set = (key: keyof T & string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await save(id, values);
    setBusy(false);
    if (!r.ok) {
      if ('fieldErrors' in r) setErrors(r.fieldErrors);
      else setError(r.error.message);
      return;
    }
    setOpen(false);
    toast.success(id ? 'Changes saved' : 'Added to your profile');
    router.refresh();
  };

  return { open, setOpen, editing: id !== null, values, errors, error, busy, start, set, submit };
}
