'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/choice';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { setArbitratorAvailability } from '@/lib/actions/disputes';

export function AvailabilityPanel({ available, capacity, active }: { available: boolean; capacity: number; active: number }) {
  const router = useRouter();
  const [on, setOn] = React.useState(available);
  const [cap, setCap] = React.useState(capacity);
  const [busy, setBusy] = React.useState(false);

  const save = async (nextOn: boolean, nextCap: number | null) => {
    setBusy(true);
    const r = await setArbitratorAvailability(nextOn, nextCap);
    setBusy(false);
    if (!r.ok) {
      setOn(available);
      return toast.error(r.error.message);
    }
    toast.success(nextOn ? 'You can receive new cases' : 'You will not receive new cases');
    router.refresh();
  };

  const capValid = Number.isInteger(cap) && cap >= 1 && cap <= 10;

  return (
    <section className="space-y-3" aria-labelledby="availability-title">
      <h2 id="availability-title" className="t-label-caps">Availability</h2>
      <div className="divide-y border-y">
        <div className="flex items-start justify-between gap-4 py-4">
          <div className="space-y-0.5">
            <label htmlFor="arb-available" className="t-label">Accept new cases</label>
            <p className="text-sm text-ink-secondary">
              {on ? 'New disputes can be assigned to you automatically, up to your capacity.' : 'You will not be assigned new disputes. Your open cases stay with you.'}
            </p>
          </div>
          <Switch id="arb-available" checked={on} disabled={busy} onCheckedChange={(v) => { setOn(v); void save(v, null); }} />
        </div>
        <div className="space-y-2 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label htmlFor="arb-capacity" className="t-label block">Cases at a time</label>
              <Input id="arb-capacity" type="number" min={1} max={10} value={cap} className="w-24" aria-describedby="arb-capacity-hint"
                onChange={(e) => setCap(Math.round(Number(e.target.value)))} />
            </div>
            <Button variant="secondary" disabled={!capValid || cap === capacity} loading={busy} onClick={() => void save(on, cap)}>Save capacity</Button>
          </div>
          <p id="arb-capacity-hint" className="t-meta">{active} of {capacity} slots in use. Choose 1–10.</p>
        </div>
      </div>
    </section>
  );
}
