'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { removeHoliday, setHoliday, updateSetting } from '@/lib/actions/admin';
import { formatDate } from '@/lib/format';
import { formatRupees } from '@/lib/money';

/**
 * How each setting reads to a person, rather than as a bare number.
 *
 * The shape lives here rather than on the page because a function cannot cross the boundary from a
 * Server Component into a Client one — only data can. The page names the shape; this renders it.
 */
export type SettingShape = 'basisPoints' | 'workingDays' | 'days' | 'paise' | 'coins';

const SHAPES: Record<SettingShape, (value: number) => string> = {
  basisPoints: (v) => `${v / 100}%`,
  workingDays: (v) => `${v} working day${v === 1 ? '' : 's'}`,
  days: (v) => `${v} day${v === 1 ? '' : 's'}`,
  paise: (v) => `${v} paise (${formatRupees(v)})`,
  coins: (v) => `${v.toLocaleString('en-IN')} coins`,
};

/**
 * One platform setting.
 *
 * Each of these numbers decides how money behaves for everyone — the fee on every milestone, how
 * long earnings are held, the smallest amount anyone can withdraw. A typo of one zero is the
 * difference between a 10% fee and a 100% one, so the change is confirmed with the old value and the
 * new one spelled out, and the database checks the bounds again before accepting it.
 *
 * Existing contracts are not affected by a fee change: each contract stores the fee it was created
 * with, so a change here applies only to contracts made after it.
 */
export function SettingForm({ setting, shape, label }: {
  setting: { key: string; value: number; description: string };
  /** Which of the shapes above to read this number as. */
  shape: SettingShape;
  /** What this number is called in words. The database key is shown as a quiet aside. */
  label: string;
}) {
  const router = useRouter();
  const format = SHAPES[shape];
  const [draft, setDraft] = React.useState(String(setting.value));
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Follow the server when the value changes from somewhere else.
  React.useEffect(() => setDraft(String(setting.value)), [setting.value]);

  const next = Number(draft);
  const changed = draft.trim() !== '' && Number.isFinite(next) && next !== setting.value;

  return (
    <form
      className="grid items-start gap-x-6 gap-y-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:px-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!Number.isInteger(next)) {
          setError('Enter a whole number.');
          return;
        }
        if (changed) setConfirming(true);
      }}
    >
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-2xs text-ink-muted">{setting.key}</span>
        </p>
        <p className="max-w-[58ch] text-xs leading-relaxed text-ink-secondary">{setting.description}</p>
      </div>

      <div className="flex items-start gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Field label={label} hideLabel error={error} className="w-28">
              <Input
                type="number"
                step={1}
                inputMode="numeric"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                className="h-9 text-right tabular-nums"
              />
            </Field>
            <Button type="submit" size="sm" variant={changed ? 'primary' : 'secondary'} className="h-9" disabled={!changed}>
              <Check /> Save
            </Button>
          </div>
          {/* What the number means, under the field it is typed into. */}
          <p className="text-right text-2xs tabular-nums text-ink-muted">
            {changed ? <>now {format(setting.value)} → <span className="font-medium text-ink">{format(next)}</span></> : format(setting.value)}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !open && setConfirming(false)}
        title={`Change ${label.toLowerCase()}?`}
        description={
          <>
            From <span className="font-medium">{format(setting.value)}</span> to{' '}
            <span className="font-medium">{format(next)}</span>. This applies to everyone from now on.
            {setting.key === 'fee_bps' && ' Contracts that already exist keep the fee they were created with.'}
          </>
        }
        confirmLabel="Change it"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const result = await updateSetting(setting.key, next);
          setBusy(false);
          if (!result.ok) {
            setError(result.error.message);
            setConfirming(false);
            return;
          }
          toast.success(`${label} is now ${format(next)}.`);
          setConfirming(false);
          router.refresh();
        }}
      />
    </form>
  );
}

/** The working-day calendar. A holiday is not a working day, so adding one moves every payment hold. */
export function HolidayManager({ holidays }: { holidays: { day: string; label: string }[] }) {
  const router = useRouter();
  const [day, setDay] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [removing, setRemoving] = React.useState<{ day: string; label: string } | null>(null);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await setHoliday(day, label);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`${label} added to the working-day calendar.`);
    setDay('');
    setLabel('');
    router.refresh();
  };

  const drop = async () => {
    if (!removing) return;
    setBusy(true);
    const result = await removeHoliday(removing.day);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`${removing.label} removed.`);
    setRemoving(null);
    router.refresh();
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h) => h.day >= today);
  const past = holidays.filter((h) => h.day < today);

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <Field label="Date" className="w-44">
          <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} required />
        </Field>
        <Field label="Name" className="min-w-0 flex-1 sm:max-w-xs">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} placeholder="Republic Day" required />
        </Field>
        <Button type="submit" variant="secondary" loading={busy} disabled={!day || label.trim().length < 2}>
          <Plus /> Add
        </Button>
      </form>

      {holidays.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          No holidays set. Only weekends are excluded from working days.
        </p>
      ) : (
        <ul className="ledger">
          {[...upcoming, ...past].map((holiday) => (
            <li key={holiday.day} className="flex items-center justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{holiday.label}</span>
                <span className="block t-meta">
                  {formatDate(holiday.day)}
                  {holiday.day < today ? ' · past' : ''}
                </span>
              </span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${holiday.label}`}
                onClick={() => setRemoving(holiday)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.label}?`}
        description="It becomes an ordinary working day again, which moves any payment hold that was counting past it."
        confirmLabel="Remove"
        tone="danger"
        busy={busy}
        onConfirm={drop}
      />
    </div>
  );
}
