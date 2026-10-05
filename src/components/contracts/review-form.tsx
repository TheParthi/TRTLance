'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { submitReview } from '@/lib/actions/contracts';
import { cn } from '@/lib/utils';

const CATEGORIES = {
  client: [['quality', 'Quality of work'], ['communication', 'Communication'], ['timeliness', 'Timeliness']],
  freelancer: [['clarity', 'Clarity of requirements'], ['communication', 'Communication'], ['responsiveness', 'Responsiveness']],
} as const;

/** Accessible 1–5 rating: a radio group of buttons with arrow-key support from native radios. */
function RatingInput({ label, value, onChange, name }: { label: string; value: number; onChange: (v: number) => void; name: string }) {
  return (
    <fieldset className="space-y-1">
      <legend className="t-label">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded p-1 focus-within:ring-2 focus-within:ring-focus">
            <input type="radio" className="sr-only" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
            <Star className={cn('size-6', n <= value ? 'fill-brass text-brass' : 'text-line-strong')} aria-hidden />
            <span className="sr-only">{n} star{n === 1 ? '' : 's'}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ contractId, role, counterpartName }: { contractId: string; role: 'client' | 'freelancer'; counterpartName: string }) {
  const router = useRouter();
  const [rating, setRating] = React.useState(0);
  const [ratings, setRatings] = React.useState<Record<string, number>>({});
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return toast.error('Choose an overall rating.');
    if (body.trim().length < 20) return toast.error('Write at least 20 characters.');
    setBusy(true);
    const r = await submitReview(contractId, { rating, ratings, body });
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success('Review posted');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="statement space-y-5">
      <div>
        <h2 className="t-section-title">Review {counterpartName}</h2>
        <p className="text-sm text-ink-secondary">Reviews are public, tied to this verified contract, and can be written once.</p>
      </div>
      <RatingInput label="Overall" name="overall" value={rating} onChange={setRating} />
      <div className="grid gap-4 sm:grid-cols-3">
        {CATEGORIES[role].map(([key, label]) => (
          <RatingInput key={key} label={label} name={key} value={ratings[key] ?? 0} onChange={(v) => setRatings((r) => ({ ...r, [key]: v }))} />
        ))}
      </div>
      <Field label="Your review" hint="What went well, and what could be better? At least 20 characters.">
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} />
      </Field>
      <Button type="submit" loading={busy}>Post review</Button>
    </form>
  );
}
