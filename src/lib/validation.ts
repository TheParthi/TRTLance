import { z } from 'zod';
import { parseAmount } from '@/lib/money';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => trimmed(max).transform((v) => (v === '' ? null : v)).nullable().optional();

export const skillList = z.array(z.string().trim().min(1).max(40)).max(25)
  .transform((list) => Array.from(new Set(list.map((s) => s.toLowerCase()))));

export const ProfileUpdate = z.object({
  display_name: trimmed(80).min(1, 'Enter your name.').optional(),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/, '3–30 lowercase letters, numbers or underscores.').optional(),
  headline: optionalText(120),
  bio: optionalText(2000),
  location: optionalText(80),
  website_url: z.string().trim().max(300).transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || /^https:\/\/\S{3,}$/.test(v), 'Use a full https:// address.').nullable().optional(),
  intent: z.enum(['hire', 'work', 'both']).optional(),
  skills: skillList.optional(),
  languages: z.array(trimmed(40).min(1)).max(10).optional(),
  experience_level: z.enum(['entry', 'intermediate', 'expert']).nullable().optional(),
  years_experience: z.coerce.number().int().min(0).max(60).nullable().optional(),
  avatar_path: z.string().max(300).nullable().optional(),
  onboarding_step: z.string().max(40).optional(),
});
export type ProfileUpdate = z.input<typeof ProfileUpdate>;

export const amountString = z.string().trim().refine((v) => {
  const micro = parseAmount(v);
  return micro !== null && micro > 0n;
}, 'Enter a positive amount with up to 6 decimals.');

export const MilestoneDraft = z.object({
  title: trimmed(120).min(3, 'Give each milestone a title (3+ characters).'),
  description: trimmed(2000).default(''),
  amount: amountString,
});

export const ProjectDraft = z.object({
  title: trimmed(120),
  description: trimmed(10000),
  category: z.string().nullable(),
  skills: skillList,
  budget_amount: z.string().trim().nullable(),
  experience_level: z.enum(['entry', 'intermediate', 'expert']).nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  deliverables: z.array(trimmed(200).min(1)).max(20),
  milestone_plan: z.array(MilestoneDraft).max(20),
  visibility: z.enum(['public', 'unlisted']),
  draft_step: z.number().int().min(1).max(9),
});
export type ProjectDraft = z.input<typeof ProjectDraft>;

export const ProposalInput = z.object({
  project_id: z.string().uuid(),
  cover_letter: trimmed(5000).min(50, 'Write at least 50 characters.'),
  amount: amountString,
  duration_days: z.coerce.number().int().min(1).max(730),
  relevant_skills: skillList,
  milestones: z.array(MilestoneDraft.extend({ due_in_days: z.coerce.number().int().min(1).max(730) })).min(1).max(20),
});
