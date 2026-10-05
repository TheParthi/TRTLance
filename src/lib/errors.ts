/**
 * Business errors raised by the database arrive as message "TL:<code>" with a human detail.
 * Only those are shown to users; anything else becomes a generic message (and is logged server-side).
 */
export interface AppError {
  code: string;
  message: string;
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: AppError };

const GENERIC: AppError = { code: 'unexpected', message: 'Something went wrong. Please try again.' };

export function toAppError(error: unknown): AppError {
  if (!error || typeof error !== 'object') return GENERIC;
  const e = error as { message?: string; details?: string; detail?: string; code?: string };
  if (typeof e.message === 'string' && e.message.startsWith('TL:')) {
    return { code: e.message.slice(3), message: e.details ?? e.detail ?? GENERIC.message };
  }
  if (e.code === 'PGRST301' || e.message?.includes('JWT')) {
    return { code: 'not_authenticated', message: 'Your session expired. Sign in again.' };
  }
  if (e.code === '42501') {
    return { code: 'forbidden', message: 'You do not have permission to do that.' };
  }
  if (e.code === '23505') {
    return { code: 'duplicate', message: 'That already exists.' };
  }
  return GENERIC;
}

export function fail(code: string, message: string): { ok: false; error: AppError } {
  return { ok: false, error: { code, message } };
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/** Wraps a server action body: logs unexpected errors and returns a safe result. */
export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === 'unexpected') console.error('[action]', error);
    return { ok: false, error: appError };
  }
}
