import { describe, expect, it } from 'vitest';
import { attempt, toAppError } from './errors';

describe('toAppError', () => {
  it('passes through business errors from the database', () => {
    expect(toAppError({ message: 'TL:project_closed', details: 'This project is no longer accepting proposals.' }))
      .toEqual({ code: 'project_closed', message: 'This project is no longer accepting proposals.' });
  });

  it('hides raw database messages', () => {
    const e = toAppError({ message: 'duplicate key value violates unique constraint "x_pkey"', code: 'XX000' });
    expect(e.code).toBe('unexpected');
    expect(e.message).not.toContain('constraint');
  });

  it('attempt() returns a typed result', async () => {
    expect(await attempt(async () => 3)).toEqual({ ok: true, data: 3 });
    const failed = await attempt(async () => {
      throw { message: 'TL:forbidden', details: 'Nope.' };
    });
    expect(failed).toEqual({ ok: false, error: { code: 'forbidden', message: 'Nope.' } });
  });
});
