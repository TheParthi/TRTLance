'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Checkbox } from '@/components/ui/choice';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { applyAsArbitrator } from '@/lib/actions/disputes';
import type { Category } from '@/lib/types';

export function ApplyForm({ categories, eligible }: { categories: Category[]; eligible: boolean }) {
  const router = useRouter();
  const [specs, setSpecs] = React.useState<string[]>([]);
  const [statement, setStatement] = React.useState('');
  const [capacity, setCapacity] = React.useState(3);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  const toggle = (slug: string, on: boolean) =>
    setSpecs((s) => (on ? (s.length < 3 && !s.includes(slug) ? [...s, slug] : s) : s.filter((x) => x !== slug)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (specs.length < 1 || specs.length > 3) errs.specs = 'Choose one to three specialisations.';
    if (statement.trim().length < 50) errs.statement = `Tell us about your experience in at least 50 characters (${statement.trim().length} so far).`;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) errs.capacity = 'Choose between 1 and 10 cases.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setProblem(null);
    const r = await applyAsArbitrator({ specializations: specs, statement: statement.trim(), capacity });
    setBusy(false);
    if (!r.ok) return setProblem(r.error.message);
    toast.success('Application sent. The platform team will review it.');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="statement space-y-6" aria-labelledby="apply-title">
      <div className="space-y-1">
        <h2 id="apply-title" className="t-section-title">Apply to arbitrate</h2>
        {!eligible && <p className="text-sm text-ink-secondary">The form unlocks once you meet every requirement above.</p>}
      </div>
      <fieldset disabled={!eligible || busy} className="space-y-6 disabled:opacity-60">
        <FieldGroup legend="Specialisations" hint={`Choose one to three areas you can judge well (${specs.length}/3).`} error={errors.specs}>
          <ul className="grid grid-cols-1 gap-x-6 border-t sm:grid-cols-2">
            {categories.map((c) => {
              const checked = specs.includes(c.slug);
              const id = `spec-${c.slug}`;
              return (
                <li key={c.slug} className="flex items-start gap-3 border-b py-3">
                  <Checkbox id={id} checked={checked} disabled={!checked && specs.length >= 3}
                    onCheckedChange={(v) => toggle(c.slug, v === true)} />
                  <label htmlFor={id} className="min-w-0 text-sm">
                    <span className="block font-medium">{c.label}</span>
                    {c.description && <span className="block text-xs text-ink-muted">{c.description}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </FieldGroup>
        <Field label="Your experience" error={errors.statement}
          hint="What makes you a fair, careful reviewer? Mention relevant work, reviews you have done and how you weigh evidence. At least 50 characters.">
          <Textarea rows={6} value={statement} maxLength={2000} onChange={(e) => setStatement(e.target.value)} />
        </Field>
        <Field label="Cases at a time" error={errors.capacity} hint="The most open cases you can handle at once (1–10). You can change this later.">
          <Input type="number" min={1} max={10} value={capacity} className="w-24" onChange={(e) => setCapacity(Math.round(Number(e.target.value)))} />
        </Field>
      </fieldset>
      {problem && <Callout tone="danger" role="alert">{problem}</Callout>}
      <div className="flex justify-end">
        <Button type="submit" loading={busy} disabled={!eligible}>Submit application</Button>
      </div>
    </form>
  );
}
