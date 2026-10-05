'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { attempt, type ActionResult, type AppError } from '@/lib/errors';

/**
 * Owner CRUD for public profile sections (portfolio, education, certifications).
 * Writes go straight to Supabase; row-level security only allows the owner, and contract-linked
 * portfolio items cannot be changed from here.
 */

export type FieldErrors = Record<string, string>;
export type SectionResult = ActionResult<null> | { ok: false; error: AppError; fieldErrors: FieldErrors };

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const optionalText = (max: number) => text(max).transform((v) => (v === '' ? null : v));
const httpsUrl = z.string().trim().max(500, 'Keep the link under 500 characters.')
  .transform((v) => (v === '' ? null : v))
  .refine((v) => v === null || /^https:\/\/\S{3,}$/.test(v), 'Use a full https:// address.');
const year = z.string().trim()
  .refine((v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), 'Enter a year between 1950 and 2100.')
  .transform((v) => (v === '' ? null : Number(v)));

const PortfolioInput = z.object({
  title: text(120).min(3, 'Give it a title (3+ characters).'),
  description: text(2000).default(''),
  url: httpsUrl,
});

const EducationInput = z.object({
  school: text(160).min(2, 'Enter the school or institution.'),
  degree: optionalText(160),
  field: optionalText(160),
  start_year: year,
  end_year: year,
}).refine((v) => v.start_year === null || v.end_year === null || v.end_year >= v.start_year, {
  path: ['end_year'], message: 'The end year cannot be before the start year.',
});

const CertificationInput = z.object({
  name: text(160).min(2, 'Enter the certification name.'),
  issuer: optionalText(160),
  issued_on: z.string().trim().transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Use a valid date.')
    .refine((v) => v === null || new Date(v) <= new Date(), 'The issue date cannot be in the future.'),
  credential_url: httpsUrl,
});

export type PortfolioFields = z.input<typeof PortfolioInput>;
export type EducationFields = z.input<typeof EducationInput>;
export type CertificationFields = z.input<typeof CertificationInput>;

type Table = 'portfolio_items' | 'education' | 'certifications';

function invalid(error: z.ZodError): SectionResult {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, error: { code: 'validation', message: 'Check the highlighted fields.' }, fieldErrors };
}

const uuid = z.string().uuid();

async function save(table: Table, id: string | null, values: Record<string, unknown>): Promise<SectionResult> {
  if (id !== null && !uuid.safeParse(id).success) return { ok: false, error: { code: 'not_found', message: 'That item no longer exists.' } };
  return attempt(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
    if (id === null) {
      const { error } = await supabase.from(table).insert({ ...values, user_id: auth.user.id });
      if (error) throw error;
    } else {
      let query = supabase.from(table).update(values).eq('id', id).eq('user_id', auth.user.id);
      if (table === 'portfolio_items') query = query.is('contract_id', null);
      const { data, error } = await query.select('id');
      if (error) throw error;
      if (!data?.length) throw { message: 'TL:not_found', details: 'That item no longer exists or cannot be edited.' };
    }
    await revalidate(supabase, auth.user.id);
    return null;
  });
}

async function remove(table: Table, id: string): Promise<SectionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: { code: 'not_found', message: 'That item no longer exists.' } };
  return attempt(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
    let query = supabase.from(table).delete().eq('id', id).eq('user_id', auth.user.id);
    if (table === 'portfolio_items') query = query.is('contract_id', null);
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data?.length) throw { message: 'TL:not_found', details: 'That item no longer exists or cannot be removed.' };
    await revalidate(supabase, auth.user.id);
    return null;
  });
}

async function revalidate(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  revalidatePath('/settings/portfolio');
  const { data } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
  if (data?.username) revalidatePath(`/u/${data.username}`);
}

export async function savePortfolioItem(id: string | null, input: PortfolioFields): Promise<SectionResult> {
  const parsed = PortfolioInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return save('portfolio_items', id, parsed.data);
}

export async function deletePortfolioItem(id: string): Promise<SectionResult> {
  return remove('portfolio_items', id);
}

export async function saveEducation(id: string | null, input: EducationFields): Promise<SectionResult> {
  const parsed = EducationInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return save('education', id, parsed.data);
}

export async function deleteEducation(id: string): Promise<SectionResult> {
  return remove('education', id);
}

export async function saveCertification(id: string | null, input: CertificationFields): Promise<SectionResult> {
  const parsed = CertificationInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return save('certifications', id, parsed.data);
}

export async function deleteCertification(id: string): Promise<SectionResult> {
  return remove('certifications', id);
}
