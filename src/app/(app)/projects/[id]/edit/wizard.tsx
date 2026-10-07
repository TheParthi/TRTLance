'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CloudOff, FileText, Loader2, Lock, Plus, Trash2, Upload, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioCard, RadioGroup } from '@/components/ui/choice';
import { Field, FieldGroup } from '@/components/ui/field';
import { AmountInput, Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Money } from '@/components/common/money';
import { StepList, StepProgress } from '@/components/forms/step-progress';
import { TagInput } from '@/components/forms/tag-input';
import { timelineText } from '@/components/projects/timeline';
import {
  deleteDraftProject, publishProject, recordAttachment, removeAttachment, saveDraftProject,
} from '@/lib/actions/projects';
import { CURRENCY } from '@/lib/env';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatBytes } from '@/lib/format';
import { coinsToString, formatAmount, normalizeAmount, parseAmount, toCoins } from '@/lib/money';
import { experienceLabel } from '@/lib/status';
import { BUCKETS, MAX_UPLOAD_BYTES, objectPath } from '@/lib/storage';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Category, ExperienceLevel, Project, ProjectAttachment } from '@/lib/types';
import type { ProjectDraft } from '@/lib/validation';

const STEPS = ['Basics', 'Description', 'Category', 'Skills', 'Budget', 'Timeline', 'Deliverables & milestones', 'Visibility & files', 'Review & publish'];

interface PlanRow { title: string; description: string; amount: string }

type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'error'; at?: string };

const MIN_MILESTONE = 100n;

export function ProjectWizard({ project, attachments: initialFiles, categories, coinBalance }: {
  project: Project;
  attachments: ProjectAttachment[];
  categories: Category[];
  /** Coins in the client's wallet; publishing needs at least the budget. */
  coinBalance: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(Math.min(project.draft_step, STEPS.length) - 1);
  const [form, setForm] = React.useState({
    title: project.title,
    description: project.description,
    category: project.category ?? '',
    skills: project.skills,
    experience_level: (project.experience_level ?? '') as ExperienceLevel | '',
    budget_amount: project.budget_amount ? normalizeAmount(project.budget_amount) : '',
    start_date: project.start_date ?? '',
    due_date: project.due_date ?? '',
    deliverables: project.deliverables.length ? project.deliverables : [''],
    milestone_plan: project.milestone_plan.map((m) => ({ title: m.title, description: m.description ?? '', amount: m.amount ? normalizeAmount(m.amount) : '' })) as PlanRow[],
    visibility: project.visibility,
  });
  const [files, setFiles] = React.useState(initialFiles);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [save, setSave] = React.useState<SaveState>({ kind: 'idle' });
  const [publishing, setPublishing] = React.useState(false);
  const [shortfall, setShortfall] = React.useState<{ coins: string; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const dirty = React.useRef(false);
  const heading = React.useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const payload = React.useCallback((s: number): ProjectDraft => ({
    title: form.title,
    description: form.description,
    category: form.category || null,
    skills: form.skills,
    budget_amount: form.budget_amount || null,
    experience_level: form.experience_level || null,
    start_date: form.start_date || null,
    due_date: form.due_date || null,
    deliverables: form.deliverables.map((d) => d.trim()).filter(Boolean),
    milestone_plan: form.milestone_plan.filter((m) => m.title.trim() || m.amount.trim()),
    visibility: form.visibility,
    draft_step: s + 1,
  }), [form]);

  const persist = React.useCallback(async (s: number) => {
    setSave({ kind: 'saving' });
    const r = await saveDraftProject(project.id, payload(s));
    if (r.ok) {
      dirty.current = false;
      setSave({ kind: 'saved', at: r.data.savedAt });
      return true;
    }
    setSave({ kind: 'error' });
    if (r.error.code !== 'validation') toast.error(r.error.message);
    return false;
  }, [payload, project.id]);

  // Autosave 1.5 s after the last change.
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => void persist(step), 1500);
    return () => clearTimeout(t);
  }, [form, persist, step]);

  React.useEffect(() => {
    heading.current?.focus();
  }, [step]);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const budgetCoins = parseAmount(form.budget_amount);
  const planCoins = form.milestone_plan.reduce((sum, m) => sum + (parseAmount(m.amount) ?? 0n), 0n);
  const balance = toCoins(coinBalance);
  const missing = budgetCoins && budgetCoins > balance ? budgetCoins - balance : 0n;

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    switch (STEPS[s]) {
      case 'Basics':
        if (form.title.trim().length < 10) e.title = 'Use at least 10 characters so freelancers know what this is.';
        break;
      case 'Description':
        if (form.description.trim().length < 30) e.description = 'Describe the work in at least 30 characters.';
        break;
      case 'Category':
        if (!form.category) e.category = 'Choose a category.';
        break;
      case 'Skills':
        if (!form.skills.length) e.skills = 'Add at least one skill.';
        if (!form.experience_level) e.experience_level = 'Choose an experience level.';
        break;
      case 'Budget':
        if (!budgetCoins || budgetCoins <= 0n) e.budget_amount = `Enter a whole number of ${CURRENCY}, e.g. 5000.`;
        break;
      case 'Timeline':
        if (form.due_date && form.due_date < new Date().toISOString().slice(0, 10)) e.due_date = 'The due date is in the past.';
        if (form.start_date && form.due_date && form.due_date < form.start_date) e.due_date = 'The due date must be after the start date.';
        break;
      case 'Deliverables & milestones':
        if (form.milestone_plan.some((m) => m.title.trim().length < 3 || !parseAmount(m.amount))) e.milestone_plan = 'Each suggested milestone needs a title and a whole number of coins.';
        else if (form.milestone_plan.some((m) => (parseAmount(m.amount) ?? 0n) < MIN_MILESTONE)) e.milestone_plan = `Each milestone must be at least ${formatAmount(coinsToString(MIN_MILESTONE))}.`;
        else if (form.milestone_plan.length && planCoins !== budgetCoins) e.milestone_plan = `Milestones add up to ${formatAmount(coinsToString(planCoins))}; the budget is ${formatAmount(form.budget_amount || '0')}.`;
        break;
    }
    return e;
  };

  const [moving, setMoving] = React.useState(false);
  const go = async (target: number) => {
    if (moving) return;
    if (target > step) {
      const e = validate(step);
      setErrors(e);
      if (Object.keys(e).length) return;
    } else setErrors({});
    setMoving(true);
    await persist(target);
    setMoving(false);
    setStep(target);
  };

  const publish = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        return toast.error('Complete this step before publishing.');
      }
    }
    setPublishing(true);
    setShortfall(null);
    if (!(await persist(STEPS.length - 1))) return setPublishing(false);
    const r = await publishProject(project.id);
    if (!r.ok) {
      setPublishing(false);
      if (r.error.code === 'insufficient_coins') {
        // The database states the exact shortfall ("You need 400 more coins…"); fall back to our own estimate.
        const need = /need ([\d,]+) more/.exec(r.error.message)?.[1]?.replace(/,/g, '') ?? coinsToString(missing);
        return setShortfall({ coins: need, message: r.error.message });
      }
      return toast.error(r.error.message);
    }
    toast.success('Your project is live');
    router.replace(`/projects/${project.id}`);
    router.refresh();
  };

  const title = STEPS[step];
  const categoryLabel = categories.find((c) => c.slug === form.category)?.label;

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <Link href="/projects" className="t-meta hover:text-ink">← All projects</Link>
          <StepList steps={STEPS} current={step} onSelect={(i) => void go(i)} />
          <SaveIndicator state={save} onRetry={() => void persist(step)} />
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="space-y-3 lg:hidden">
          <StepProgress steps={STEPS} current={step} />
          <SaveIndicator state={save} onRetry={() => void persist(step)} />
        </div>

        <section className="statement space-y-6 md:p-8" aria-labelledby="wizard-step-title">
          <div className="space-y-1">
            <p className="t-eyebrow">Step {step + 1} of {STEPS.length}</p>
            <h1 id="wizard-step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none focus-visible:ring-0 focus-visible:ring-offset-0">{titles[title]}</h1>
          </div>

          {title === 'Basics' && (
            <Field label="Project title" hint="A short, specific title, e.g. “Redesign our pricing page in Figma and Webflow”." error={errors.title}>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} autoFocus />
            </Field>
          )}

          {title === 'Description' && (
            <Field
              label="Describe the work"
              hint="Include the goal, what “done” looks like, anything you already have (designs, code, accounts) and how you like to communicate."
              error={errors.description}
            >
              <Textarea rows={12} value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={10000} />
            </Field>
          )}

          {title === 'Category' && (
            <FieldGroup legend="Category" error={errors.category}>
              <RadioGroup value={form.category} onValueChange={(v) => set('category', v)} className="grid gap-2 sm:grid-cols-2" aria-label="Category">
                {categories.map((c) => <RadioCard key={c.slug} value={c.slug} title={c.label} description={c.description} />)}
              </RadioGroup>
            </FieldGroup>
          )}

          {title === 'Skills' && (
            <div className="space-y-6">
              <Field label="Skills needed" hint="Freelancers with these skills see your project first. Up to 15." error={errors.skills}>
                <TagInput value={form.skills} onChange={(v) => set('skills', v)} max={15} placeholder="Type a skill and press Enter" />
              </Field>
              <FieldGroup legend="Experience level" error={errors.experience_level}>
                <RadioGroup value={form.experience_level} onValueChange={(v) => set('experience_level', v as ExperienceLevel)} className="grid gap-2 sm:grid-cols-3" aria-label="Experience level">
                  <RadioCard value="entry" title="Entry" description="Straightforward work, lower budgets." />
                  <RadioCard value="intermediate" title="Intermediate" description="Solid experience with similar projects." />
                  <RadioCard value="expert" title="Expert" description="Deep expertise for complex work." />
                </RadioGroup>
              </FieldGroup>
            </div>
          )}

          {title === 'Budget' && (
            <div className="space-y-5">
              <Field label={`Fixed budget (${CURRENCY})`} hint="The total you expect to pay. Freelancers can propose a different amount." error={errors.budget_amount}>
                <AmountInput unit={CURRENCY} inputMode="numeric" value={form.budget_amount} onChange={(e) => set('budget_amount', e.target.value)} placeholder="5000" className="max-w-xs" />
              </Field>
              <CoinBalance balance={coinBalance} missing={missing} />
              <p className="flex max-w-reading gap-2 text-sm text-ink-secondary">
                <Lock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span><span className="font-medium text-ink">Coins stay in your wallet when you publish.</span> You need enough coins to cover the budget before you post. After you hire someone and you both sign, the agreed amount is locked in TrustLance escrow and released milestone by milestone as you approve the work.</span>
              </p>
            </div>
          )}

          {title === 'Timeline' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Start date" optional>
                <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </Field>
              <Field label="Due date" optional error={errors.due_date}>
                <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
              </Field>
              <p className="text-sm text-ink-secondary sm:col-span-2">Leave both empty if you are flexible. Freelancers propose their own duration and per-milestone deadlines.</p>
            </div>
          )}

          {title === 'Deliverables & milestones' && (
            <div className="space-y-8">
              <FieldGroup legend="Deliverables" hint="Concrete things you will receive. These become part of the contract.">
                <ul className="space-y-2">
                  {form.deliverables.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <Input aria-label={`Deliverable ${i + 1}`} value={d} maxLength={200} placeholder="e.g. Responsive homepage in Webflow"
                        onChange={(e) => set('deliverables', form.deliverables.map((x, j) => (j === i ? e.target.value : x)))} />
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove deliverable ${i + 1}`}
                        onClick={() => set('deliverables', form.deliverables.filter((_, j) => j !== i))}><Trash2 /></Button>
                    </li>
                  ))}
                </ul>
                {form.deliverables.length < 20 && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => set('deliverables', [...form.deliverables, ''])}><Plus /> Add deliverable</Button>
                )}
              </FieldGroup>

              <FieldGroup legend="Suggested milestones" hint="Optional. Splitting payment into milestones lowers risk for both sides. Amounts must add up to your budget." error={errors.milestone_plan}>
                {form.milestone_plan.length > 0 && <PlanRail plan={form.milestone_plan} className="my-3" />}
                <ol className={form.milestone_plan.length ? 'ledger' : undefined}>
                  {form.milestone_plan.map((m, i) => (
                    <li key={i} className="space-y-3 py-5">
                      <div className="flex items-center justify-between">
                        <span className="t-label-caps">Milestone {i + 1}</span>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove milestone ${i + 1}`}
                          onClick={() => set('milestone_plan', form.milestone_plan.filter((_, j) => j !== i))}><Trash2 /></Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                        <Field label="Title"><Input value={m.title} maxLength={120} onChange={(e) => set('milestone_plan', form.milestone_plan.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field>
                        <Field label="Amount"><AmountInput unit={CURRENCY} inputMode="numeric" placeholder="1000" value={m.amount} onChange={(e) => set('milestone_plan', form.milestone_plan.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} /></Field>
                      </div>
                      <Field label="What is delivered" optional>
                        <Textarea rows={2} value={m.description} maxLength={2000} onChange={(e) => set('milestone_plan', form.milestone_plan.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                      </Field>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {form.milestone_plan.length < 20 && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => set('milestone_plan', [...form.milestone_plan, { title: '', description: '', amount: '' }])}><Plus /> Add milestone</Button>
                  )}
                  {form.milestone_plan.length > 0 && (
                    <p className="text-sm" aria-live="polite">
                      Total <span className="t-money">{formatAmount(coinsToString(planCoins))}</span> of {formatAmount(form.budget_amount || '0')}
                      {planCoins === budgetCoins ? <Check className="ml-1 inline size-4 text-success" aria-label="matches budget" /> : null}
                    </p>
                  )}
                </div>
              </FieldGroup>
            </div>
          )}

          {title === 'Visibility & files' && (
            <div className="space-y-8">
              <FieldGroup legend="Who can find this project">
                <RadioGroup value={form.visibility} onValueChange={(v) => set('visibility', v as 'public' | 'unlisted')} className="grid gap-2 sm:grid-cols-2" aria-label="Visibility">
                  <RadioCard value="public" title="Public" description="Listed in Find work and search." />
                  <RadioCard value="unlisted" title="Unlisted" description="Not listed. Signed-in members with the link can view and apply." />
                </RadioGroup>
              </FieldGroup>
              <AttachmentManager projectId={project.id} files={files} onChange={setFiles} />
            </div>
          )}

          {title === 'Review & publish' && (
            <div className="space-y-6">
              <dl className="ledger">
                {[
                  ['Title', form.title, 0],
                  ['Category', categoryLabel ?? '—', 2],
                  ['Skills', form.skills.join(', ') || '—', 3],
                  ['Experience', form.experience_level ? experienceLabel[form.experience_level] : '—', 3],
                  ['Budget', budgetCoins ? formatAmount(form.budget_amount) : '—', 4],
                  ['Timeline', timelineText(form.start_date, form.due_date), 5],
                  ['Deliverables', `${form.deliverables.filter((d) => d.trim()).length} listed`, 6],
                  ['Suggested milestones', form.milestone_plan.length ? `${form.milestone_plan.length}` : 'None — freelancers will propose', 6],
                  ['Visibility', form.visibility === 'public' ? 'Public' : 'Unlisted', 7],
                  ['Attachments', `${files.length}`, 7],
                ].map(([label, value, target]) => (
                  <div key={label as string} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="min-w-0 break-words">{value}</dd>
                    <button type="button" className="link inline-flex h-8 items-center text-xs" onClick={() => setStep(target as number)}>Edit<span className="sr-only"> {label}</span></button>
                  </div>
                ))}
              </dl>

              {form.milestone_plan.length > 0 && (
                <section aria-labelledby="plan-review-title" className="space-y-3">
                  <h2 id="plan-review-title" className="t-label-caps">Milestone plan</h2>
                  <PlanRail plan={form.milestone_plan} />
                  <ol className="ledger text-sm">
                    {form.milestone_plan.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                        <span className="min-w-0"><span className="t-mono mr-2 text-ink-muted">{String(i + 1).padStart(2, '0')}</span>{m.title || `Milestone ${i + 1}`}</span>
                        <Money amount={coinsToString(parseAmount(m.amount) ?? 0n)} size="sm" />
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section aria-labelledby="funding-title" className="space-y-4 border-t pt-6">
                <h2 id="funding-title" className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-brand" aria-hidden /> How funding will work</h2>
                <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                  <div><dt className="t-label-caps">Project budget</dt><dd><Money amount={form.budget_amount || '0'} size="lg" /></dd></div>
                  <div><dt className="t-label-caps">Platform fee</dt><dd className="font-medium">None for you <span className="t-meta block">The fee comes out of each payment to the freelancer, not on top of your budget.</span></dd></div>
                  <div><dt className="t-label-caps">Total required at hiring</dt><dd>The amount of the proposal you accept (your budget is a guide)</dd></div>
                  <div><dt className="t-label-caps">Your coin wallet</dt><dd><CoinBalance balance={coinBalance} missing={missing} /></dd></div>
                  <div><dt className="t-label-caps">When you publish</dt><dd>No coins are spent. They are locked in TrustLance escrow only after you hire and both of you sign.</dd></div>
                </dl>
                <p className="text-xs text-ink-secondary">When you hire, you’ll review the contract, sign it, and then lock the full amount in TrustLance escrow. Work begins once the coins are locked.</p>
              </section>

              {shortfall && (
                <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-danger/40 bg-danger/5 px-4 py-3 text-sm">
                  <span className="text-ink">{shortfall.message}</span>
                  <Link className="link font-medium" href={`/wallet?buy=${shortfall.coins}`}>Buy coins</Link>
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="ghost" className="text-danger-strong" onClick={() => setConfirmDelete(true)}><Trash2 /> Delete draft</Button>
                <Button size="lg" onClick={publish} loading={publishing}>Publish project</Button>
              </div>
            </div>
          )}

          {title !== 'Review & publish' && (
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
              {step > 0 ? <Button variant="ghost" onClick={() => void go(step - 1)} disabled={moving}><ArrowLeft /> Back</Button> : <span />}
              <Button onClick={() => void go(step + 1)} loading={moving}>Continue {!moving && <ArrowRight />}</Button>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this draft?"
        description="The draft and its attachments are removed permanently."
        confirmLabel="Delete draft"
        tone="danger"
        busy={deleting}
        onConfirm={async () => {
          setDeleting(true);
          const r = await deleteDraftProject(project.id);
          if (!r.ok) {
            setDeleting(false);
            return toast.error(r.error.message);
          }
          dirty.current = false;
          router.replace('/projects');
        }}
      />
    </div>
  );
}

const titles: Record<string, string> = {
  Basics: 'What do you need done?',
  Description: 'Describe the project',
  Category: 'Which category fits best?',
  Skills: 'Skills and experience',
  Budget: 'What is your budget?',
  Timeline: 'When do you need it?',
  'Deliverables & milestones': 'Deliverables and milestones',
  'Visibility & files': 'Visibility and attachments',
  'Review & publish': 'Review and publish',
};

/** The client's coin balance, with a shortcut to buy what the budget still needs. */
function CoinBalance({ balance, missing }: { balance: string; missing: bigint }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
      <Coins className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span>You have <span className="t-money font-medium text-ink">{formatAmount(balance)}</span>.</span>
      {missing > 0n && (
        <span>
          {formatAmount(coinsToString(missing))} more needed to publish —{' '}
          <Link className="link" href={`/wallet?buy=${coinsToString(missing)}`}>buy coins</Link>
        </span>
      )}
    </p>
  );
}

/** The suggested plan drawn as a neutral rail (amounts that are not valid yet count as zero). */
function PlanRail({ plan, className }: { plan: PlanRow[]; className?: string }) {
  const segments = proposalSegments(plan.map((m, i) => ({ position: i + 1, title: m.title.trim() || `Milestone ${i + 1}`, amount: coinsToString(parseAmount(m.amount) ?? 0n) })));
  return <EscrowRail segments={segments} size="md" label="Suggested milestone plan" className={className} />;
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-muted" role="status" aria-live="polite">
      {state.kind === 'saving' && <><Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…</>}
      {state.kind === 'saved' && <><Check className="size-3.5 text-success" aria-hidden /> Draft saved</>}
      {state.kind === 'error' && (
        <><CloudOff className="size-3.5 text-danger" aria-hidden /> Not saved. <button type="button" className="link" onClick={onRetry}>Retry</button></>
      )}
      {state.kind === 'idle' && 'Changes save automatically'}
    </p>
  );
}

function AttachmentManager({ projectId, files, onChange }: {
  projectId: string;
  files: ProjectAttachment[];
  onChange: (f: ProjectAttachment[]) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState<string[]>([]);

  const upload = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX_UPLOAD_BYTES['project-files']) {
        toast.error(`${file.name} is larger than 25 MB.`);
        continue;
      }
      setUploading((u) => [...u, file.name]);
      const path = objectPath(projectId, file.name);
      const { error } = await getBrowserClient().storage.from(BUCKETS.projectFiles).upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast.error(`Upload of ${file.name} failed.`);
      } else {
        const r = await recordAttachment({ projectId, storagePath: path, fileName: file.name, size: file.size, mimeType: file.type });
        if (r.ok) {
          onChange([...files, { id: r.data, project_id: projectId, storage_path: path, file_name: file.name, size_bytes: file.size, mime_type: file.type, created_at: new Date().toISOString() }]);
        } else {
          await getBrowserClient().storage.from(BUCKETS.projectFiles).remove([path]);
          toast.error(r.error.message);
        }
      }
      setUploading((u) => u.filter((n) => n !== file.name));
    }
    if (input.current) input.current.value = '';
  };

  return (
    <FieldGroup legend="Attachments" hint="Briefs, wireframes or reference files. Up to 25 MB each. Visible to anyone who can view the project.">
      {files.length > 0 && (
        <ul className="ledger">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
              <FileText className="size-4 text-ink-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
              <span className="t-meta">{formatBytes(f.size_bytes)}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${f.file_name}`}
                onClick={async () => {
                  const r = await removeAttachment(f.id);
                  if (r.ok) onChange(files.filter((x) => x.id !== f.id));
                  else toast.error(r.error.message);
                }}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      {uploading.map((n) => (
        <p key={n} className="flex items-center gap-2 text-sm text-ink-secondary" role="status"><Loader2 className="size-4 animate-spin" aria-hidden /> Uploading {n}…</p>
      ))}
      <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => void upload(e.target.files)} />
      <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}><Upload /> Add files</Button>
    </FieldGroup>
  );
}
