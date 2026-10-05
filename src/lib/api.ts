import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toAppError } from '@/lib/errors';

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Per-user rate limit backed by the database (works across serverless instances). */
export async function rateLimit(bucket: string, subject: string, limit: number, windowSeconds: number) {
  const { error } = await createAdminClient().rpc('check_rate_limit', {
    p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds, p_subject: subject,
  });
  if (error) {
    const e = toAppError(error);
    return e.code === 'rate_limited' ? jsonError(429, e.code, e.message) : null;
  }
  return null;
}
