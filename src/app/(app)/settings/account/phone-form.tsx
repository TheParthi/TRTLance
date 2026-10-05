'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { updatePrivate } from '@/lib/actions/profile';

export function PhoneForm({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [value, setValue] = React.useState(phone ?? '');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !/^\+?[0-9 ()-]{6,20}$/.test(trimmed)) return setError('Enter a valid phone number, e.g. +91 98765 43210.');
    setError(null);
    setBusy(true);
    const r = await updatePrivate({ phone: trimmed || null });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    toast.success(trimmed ? 'Phone number saved' : 'Phone number removed');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Field label="Phone number" optional error={error} hint="Private. Only used to contact you about your account." className="flex-1">
        <Input type="tel" autoComplete="tel" inputMode="tel" value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} placeholder="+91 98765 43210" />
      </Field>
      <Button type="submit" variant="secondary" loading={busy} className="sm:mt-7">Save phone</Button>
    </form>
  );
}
