'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Compass, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { RadioCard, RadioGroup } from '@/components/ui/choice';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { AvatarUpload } from '@/components/forms/avatar-upload';
import { TagInput } from '@/components/forms/tag-input';
import { SettingsSection, SettingsSections } from '@/components/settings/settings-section';
import { updateProfile } from '@/lib/actions/profile';
import type { ExperienceLevel, Intent, Profile } from '@/lib/types';

type Form = {
  display_name: string;
  username: string;
  headline: string;
  location: string;
  website_url: string;
  bio: string;
  intent: Intent;
  skills: string[];
  languages: string[];
  experience_level: string;
  years_experience: string;
};
type Errors = Partial<Record<keyof Form, string>>;

/** Mirrors the ProfileUpdate schema so problems are shown next to each field before saving. */
function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.display_name.trim()) e.display_name = 'Enter your name.';
  else if (f.display_name.trim().length > 80) e.display_name = 'Keep your name under 80 characters.';
  if (!/^[a-z0-9_]{3,30}$/.test(f.username.trim())) e.username = '3–30 lowercase letters, numbers or underscores.';
  if (f.headline.trim().length > 120) e.headline = 'Keep your headline under 120 characters.';
  if (f.location.trim().length > 80) e.location = 'Keep the location under 80 characters.';
  if (f.bio.trim().length > 2000) e.bio = 'Keep your bio under 2,000 characters.';
  const url = f.website_url.trim();
  if (url && (url.length > 300 || !/^https:\/\/\S{3,}$/.test(url))) e.website_url = 'Use a full https:// address.';
  if (f.years_experience !== '') {
    const n = Number(f.years_experience);
    if (!Number.isInteger(n) || n < 0 || n > 60) e.years_experience = 'Enter a whole number from 0 to 60.';
  }
  return e;
}

const SKILL_SUGGESTIONS = ['react', 'typescript', 'node.js', 'python', 'figma', 'solidity', 'copywriting', 'seo'];

export function ProfileForm({ userId, profile }: { userId: string; profile: Profile }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState(profile.avatar_path);
  const [form, setForm] = React.useState<Form>({
    display_name: profile.display_name,
    username: profile.username,
    headline: profile.headline ?? '',
    location: profile.location ?? '',
    website_url: profile.website_url ?? '',
    bio: profile.bio ?? '',
    intent: profile.intent,
    skills: profile.skills,
    languages: profile.languages,
    experience_level: profile.experience_level ?? '',
    years_experience: profile.years_experience?.toString() ?? '',
  });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const saveAvatar = async (path: string | null) => {
    const r = await updateProfile({ avatar_path: path });
    if (!r.ok) return void toast.error(r.error.message);
    setAvatar(path);
    toast.success(path ? 'Photo updated' : 'Photo removed');
    router.refresh();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    const r = await updateProfile({
      ...form,
      username: form.username.trim(),
      experience_level: (form.experience_level || null) as ExperienceLevel | null,
      years_experience: form.years_experience === '' ? null : Number(form.years_experience),
    });
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === 'username_taken' || r.error.code === 'duplicate') setErrors({ username: 'That username is taken. Try another.' });
      else setFormError(r.error.message);
      return;
    }
    toast.success('Profile saved');
    router.refresh();
  };

  const workerLike = form.intent !== 'hire';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <SettingsSections>
        <SettingsSection
          id="public"
          title="Public profile"
          description={<>Shown at <Link href={`/u/${profile.username}`} className="link">/u/{profile.username}</Link>. Your email and phone are never shown.</>}
        >
          <div className="space-y-2">
            <AvatarUpload userId={userId} name={form.display_name} path={avatar} onUploaded={saveAvatar} />
            {avatar && <Button type="button" variant="link" size="sm" onClick={() => void saveAvatar(null)}>Remove photo</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.display_name}>
              <Input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} maxLength={80} autoComplete="name" required />
            </Field>
            <Field label="Username" error={errors.username} hint={`Public URL: /u/${form.username || 'username'}. Changing it breaks old links.`}>
              <Input value={form.username} onChange={(e) => set('username', e.target.value.toLowerCase())} maxLength={30} autoCapitalize="none" spellCheck={false} />
            </Field>
          </div>
          <Field label="Headline" optional error={errors.headline} hint="One line, e.g. “Full-stack developer for early-stage startups”.">
            <Input value={form.headline} onChange={(e) => set('headline', e.target.value)} maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location" optional error={errors.location} hint="City or country.">
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={80} />
            </Field>
            <Field label="Website" optional error={errors.website_url}>
              <Input type="url" inputMode="url" placeholder="https://" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} maxLength={300} />
            </Field>
          </div>
          <Field label="About" optional error={errors.bio} hint={`${form.bio.length.toLocaleString()} / 2,000 characters.`}>
            <Textarea rows={6} value={form.bio} onChange={(e) => set('bio', e.target.value)} maxLength={2000} />
          </Field>
        </SettingsSection>

        <SettingsSection id="goal" title="How you use TrustLance" description="Your goal, and the skills used to match you with work.">
          <FieldGroup legend="Your goal" hint="This changes your navigation and dashboard. Existing projects and contracts are not affected.">
            <RadioGroup value={form.intent} onValueChange={(v) => set('intent', v as Intent)} className="grid gap-3 xl:grid-cols-3" aria-label="Your goal">
              <RadioCard value="hire" icon={<Briefcase />} title="Hire talent" description="Post projects and fund work in escrow." />
              <RadioCard value="work" icon={<Compass />} title="Find work" description="Send proposals and get paid on approval." />
              <RadioCard value="both" icon={<Handshake />} title="Both" description="Hire for some projects, work on others." />
            </RadioGroup>
          </FieldGroup>
          <Field label="Skills" optional hint={workerLike ? 'Used to match you with projects. Up to 25.' : 'The kind of work you hire for. Up to 25.'}>
            <TagInput value={form.skills} onChange={(v) => set('skills', v)} max={25} placeholder="Type a skill and press Enter" suggestions={SKILL_SUGGESTIONS} />
          </Field>
          <Field label="Languages" optional hint="Up to 10.">
            <TagInput value={form.languages} onChange={(v) => set('languages', v)} max={10} placeholder="e.g. english" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Experience level" optional>
              <Select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="entry">Entry level</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </Select>
            </Field>
            <Field label="Years of experience" optional error={errors.years_experience}>
              <Input type="number" min={0} max={60} inputMode="numeric" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} />
            </Field>
          </div>
        </SettingsSection>
      </SettingsSections>

      <div className="grid grid-cols-1 gap-4 border-t pt-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
        <div className="space-y-4 lg:col-start-2">
          {formError && <Callout tone="danger" role="alert" title="Your profile was not saved">{formError}</Callout>}
          <Button type="submit" loading={busy} className="w-full sm:w-auto">Save profile</Button>
        </div>
      </div>
    </form>
  );
}
