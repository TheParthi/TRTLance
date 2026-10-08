'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { adminAssignArbitrator } from '@/lib/actions/disputes';

export interface ArbitratorOption {
  id: string;
  name: string;
  active: number;
  capacity: number;
  specializations: string;
}

/** Assigns an approved, available arbitrator. The database refuses anyone with a conflict of interest. */
export function AssignForm({ disputeId, options, label }: { disputeId: string; options: ArbitratorOption[]; label: string }) {
  const router = useRouter();
  const [choice, setChoice] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const id = React.useId();

  if (!options.length) return <p className="t-meta">No approved arbitrators are available right now. You can decide the case yourself in the case room.</p>;

  return (
    <form
      className="space-y-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!choice) return setError('Choose an arbitrator.');
        setBusy(true);
        setError(null);
        const r = await adminAssignArbitrator(disputeId, choice);
        setBusy(false);
        if (!r.ok) return setError(r.error.message);
        toast.success('Arbitrator assigned. Both parties have 3 days to add evidence.');
        router.refresh();
      }}
    >
      <label htmlFor={id} className="t-label">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select id={id} value={choice} onChange={(e) => { setChoice(e.target.value); setError(null); }} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined}>
          <option value="">Choose an arbitrator…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} · {o.active}/{o.capacity} cases{o.active >= o.capacity ? ' (at capacity)' : ''} · {o.specializations}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" loading={busy}>Assign</Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-danger-strong">{error}</p>}
    </form>
  );
}
