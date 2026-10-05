'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Compass, Handshake, Mail, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { RadioCard, RadioGroup } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { AvatarUpload } from '@/components/forms/avatar-upload';
import { StepProgress } from '@/components/forms/step-progress';
import { TagInput } from '@/components/forms/tag-input';
import { completeOnboarding, updateProfile } from '@/lib/actions/profile';
import { shortAddress } from '@/lib/format';
import type { Intent, Profile } from '@/lib/types';
import type { ProfileUpdate } from '@/lib/validation';

const STEPS = ['Welcome', 'Your goal', 'About you', 'Skills', 'Photo', 'Professional details', 'Trust & wallet', 'Done'] as const;
const SKILL_SUGGESTIONS = ['react', 'typescript', 'node.js', 'python', 'figma', 'solidity', 'copywriting', 'seo', 'data analysis'];

export function OnboardingWizard({ userId, email, emailVerified, walletAddress, profile }: {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  walletAddress: string | null;
  profile: Profile;
}) {
  const router = useRouter();
  const initial = Math.max(0, STEPS.findIndex((s) => s.toLowerCase().replace(/[^a-z]/g, '') === profile.onboarding_step));
  const [step, setStep] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    intent: profile.intent as Intent,
    display_name: profile.display_name,
    username: profile.username,
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    skills: profile.skills,
    experience_level: profile.experience_level ?? '',
    years_experience: profile.years_experience?.toString() ?? '',
    avatar_path: profile.avatar_path,
    bio: profile.bio ?? '',
    website_url: profile.website_url ?? '',
    languages: profile.languages,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const heading = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => heading.current?.focus(), [step]);

  const stepKey = (i: number) => STEPS[i].toLowerCase().replace(/[^a-z]/g, '');

  const patchFor = (i: number): ProfileUpdate => {
    switch (STEPS[i]) {
      case 'Your goal': return { intent: form.intent };
      case 'About you': return { display_name: form.display_name, username: form.username, headline: form.headline, location: form.location };
      case 'Skills': return {
        skills: form.skills,
        experience_level: (form.experience_level || null) as ProfileUpdate['experience_level'],
        years_experience: form.years_experience === '' ? null : Number(form.years_experience),
      };
      case 'Professional details': return { bio: form.bio, website_url: form.website_url, languages: form.languages };
      default: return {};
    }
  };

  const next = async () => {
    setError(null);
    setBusy(true);
    const result = await updateProfile({ ...patchFor(step), onboarding_step: stepKey(step + 1) });
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    setStep((s) => s + 1);
  };

  const finish = async () => {
    setBusy(true);
    const result = await completeOnboarding();
    if (!result.ok) {
      setBusy(false);
      return setError(result.error.message);
    }
    router.replace(form.intent === 'hire' ? '/projects/new' : form.intent === 'work' ? '/work' : '/dashboard');
    router.refresh();
  };

  const title = STEPS[step];
  const optional = ['Photo', 'Professional details', 'Trust & wallet'].includes(title);
  const workerLike = form.intent !== 'hire';

  return (
    <div className="space-y-8">
      <StepProgress steps={[...STEPS]} current={step} />
      <section className="panel space-y-6 p-6 md:p-8" aria-labelledby="step-title">
        {title === 'Welcome' && (
          <div className="space-y-4">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">Welcome to TrustLance, {form.display_name.split(' ')[0]}</h1>
            <p className="text-ink-secondary">
              A few questions so we can show you the right things. It takes about three minutes, and everything except your goal can be changed later.
            </p>
            <ul className="space-y-2 text-sm text-ink-secondary">
              <li>• We only ask for what other members need to trust you.</li>
              <li>• Your email and phone are never shown publicly.</li>
              <li>• A wallet is only needed when you sign or fund a contract.</li>
            </ul>
          </div>
        )}

        {title === 'Your goal' && (
          <div className="space-y-4">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">What brings you here?</h1>
            <p className="text-sm text-ink-secondary">This shapes your dashboard and navigation. You can change it in settings.</p>
            <RadioGroup value={form.intent} onValueChange={(v) => set('intent', v as Intent)} className="grid gap-3" aria-label="Your goal">
              <RadioCard value="hire" icon={<Briefcase />} title="Hire talent" description="Post projects, compare proposals and fund work in escrow." />
              <RadioCard value="work" icon={<Compass />} title="Find work" description="Discover funded projects, send proposals and get paid on approval." />
              <RadioCard value="both" icon={<Handshake />} title="Both" description="Hire for some projects and take on others." />
            </RadioGroup>
          </div>
        )}

        {title === 'About you' && (
          <div className="space-y-5">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">How should people know you?</h1>
            <Field label="Full name"><Input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={80} required /></Field>
            <Field label="Username" hint={`Your public profile: /u/${form.username || 'username'}`}>
              <Input value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase())} maxLength={30} autoCapitalize="none" spellCheck={false} />
            </Field>
            <Field label="Headline" optional hint="One line, e.g. “Full-stack developer for early-stage startups”.">
              <Input value={form.headline} onChange={(e) => set('headline', e.target.value)} maxLength={120} />
            </Field>
            <Field label="Location" optional hint="City or country. Helps with time zones.">
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={80} />
            </Field>
          </div>
        )}

        {title === 'Skills' && (
          <div className="space-y-5">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">{workerLike ? 'What do you do best?' : 'What kind of work do you hire for?'}</h1>
            <Field label="Skills" hint={workerLike ? 'Used to recommend projects that fit you. Up to 25.' : 'Helps us suggest relevant freelancers.'}>
              <TagInput value={form.skills} onChange={(v) => set('skills', v)} max={25} placeholder="Type a skill and press Enter" suggestions={SKILL_SUGGESTIONS} />
            </Field>
            {workerLike && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Experience level" optional>
                  <Select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="entry">Entry level</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </Select>
                </Field>
                <Field label="Years of experience" optional>
                  <Input type="number" min={0} max={60} inputMode="numeric" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}

        {title === 'Photo' && (
          <div className="space-y-5">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">Add a profile photo</h1>
            <p className="text-sm text-ink-secondary">Members are more likely to respond to a real face. You can skip this.</p>
            <AvatarUpload
              userId={userId}
              name={form.display_name}
              path={form.avatar_path}
              onUploaded={async (path) => {
                const r = await updateProfile({ avatar_path: path });
                if (r.ok) set('avatar_path', path);
                else toast.error(r.error.message);
              }}
            />
          </div>
        )}

        {title === 'Professional details' && (
          <div className="space-y-5">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">Tell people about your work</h1>
            <Field label="About" optional hint="What you do, who you work with and how. Up to 2,000 characters.">
              <Textarea rows={6} value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={2000} />
            </Field>
            <Field label="Website or portfolio" optional>
              <Input type="url" placeholder="https://" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} />
            </Field>
            <Field label="Languages" optional>
              <TagInput value={form.languages} onChange={(v) => set('languages', v)} max={10} placeholder="e.g. english" suggestions={['english', 'hindi', 'tamil']} />
            </Field>
          </div>
        )}

        {title === 'Trust & wallet' && (
          <div className="space-y-5">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">How trust works on TrustLance</h1>
            <p className="text-sm text-ink-secondary">Other members see only verified facts about you — never claims we cannot check.</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 rounded-lg border p-4">
                <Mail className="mt-0.5 size-5 text-brand" aria-hidden />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Email</p>
                  <p className="text-ink-secondary">{emailVerified ? `${email} is verified.` : `Confirm ${email ?? 'your email'} using the link we sent.`}</p>
                </div>
                {emailVerified && <CheckCircle2 className="size-5 text-success" aria-label="Verified" />}
              </li>
              <li className="flex items-start gap-3 rounded-lg border p-4">
                <Wallet className="mt-0.5 size-5 text-brand" aria-hidden />
                <div className="flex-1 space-y-2 text-sm">
                  <p className="font-semibold">Wallet</p>
                  {walletAddress ? (
                    <p className="text-ink-secondary">Wallet {shortAddress(walletAddress)} is verified.</p>
                  ) : (
                    <p className="text-ink-secondary">
                      Escrow is funded from — and pays out to — a wallet you prove you own by signing a free message.
                      You need one before you sign a contract. You can do it now or later.
                    </p>
                  )}
                  {!walletAddress && <Link href="/wallet" className="link">Verify a wallet now</Link>}
                </div>
                {walletAddress && <CheckCircle2 className="size-5 text-success" aria-label="Verified" />}
              </li>
            </ul>
          </div>
        )}

        {title === 'Done' && (
          <div className="space-y-4">
            <h1 id="step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">You’re ready</h1>
            <p className="text-ink-secondary">
              {form.intent === 'hire' && 'Next: post your first project. You’ll fund escrow only after you choose a freelancer and you both sign.'}
              {form.intent === 'work' && 'Next: browse open projects. Each shows the client’s verified track record and an AI risk summary.'}
              {form.intent === 'both' && 'Your dashboard shows what needs your attention as a client and as a freelancer.'}
            </p>
          </div>
        )}

        {error && <Callout tone="danger" role="alert">{error}</Callout>}

        <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}><ArrowLeft /> Back</Button>
          ) : <span />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {optional && <Button variant="secondary" onClick={next} disabled={busy}>Skip</Button>}
            {title === 'Done' ? (
              <Button onClick={finish} loading={busy}>
                {form.intent === 'hire' ? 'Post a project' : form.intent === 'work' ? 'Find work' : 'Go to dashboard'} <ArrowRight />
              </Button>
            ) : (
              <Button onClick={next} loading={busy}>{step === 0 ? 'Get started' : 'Continue'} <ArrowRight /></Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
