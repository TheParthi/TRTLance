import { describe, expect, it } from 'vitest';
import { nextAction } from './next-action';

const c = (status: string, signed: Partial<{ client_signed_at: string; freelancer_signed_at: string }> = {}) => ({
  id: 'c1', status: status as never, client_signed_at: signed.client_signed_at ?? null, freelancer_signed_at: signed.freelancer_signed_at ?? null,
});
const m = (position: number, status: string) => ({ id: `m${position}`, position, title: `M${position}`, status: status as never });

describe('nextAction', () => {
  it('asks each party to sign, then waits for the other', () => {
    expect(nextAction('client', c('pending_signatures'), []).target).toBe('#sign');
    expect(nextAction('client', c('pending_signatures', { client_signed_at: 'x' }), []).tone).toBe('waiting');
  });

  it('asks only the client to fund and tells the freelancer not to start', () => {
    expect(nextAction('client', c('awaiting_funding'), []).target).toBe('#fund');
    expect(nextAction('freelancer', c('awaiting_funding'), []).detail).toMatch(/Do not start/);
  });

  it('prioritises releasing approved work, then reviewing submissions, for clients', () => {
    const ms = [m(1, 'submitted'), m(2, 'approved')];
    expect(nextAction('client', c('active'), ms).title).toMatch(/Release payment for milestone 2/);
    expect(nextAction('client', c('active'), [m(1, 'submitted'), m(2, 'funded')]).title).toMatch(/Review milestone 1/);
  });

  it('points freelancers at revisions before new deliveries', () => {
    const ms = [m(1, 'funded'), m(2, 'revision_requested')];
    expect(nextAction('freelancer', c('active'), ms).milestoneId).toBe('m2');
    expect(nextAction('freelancer', c('active'), [m(1, 'paid'), m(2, 'funded')]).title).toMatch(/Deliver milestone 2/);
  });

  it('puts work the freelancer can deliver ahead of milestones waiting on the client', () => {
    expect(nextAction('freelancer', c('active'), [m(1, 'submitted'), m(2, 'funded')]).milestoneId).toBe('m2');
    expect(nextAction('freelancer', c('active'), [m(1, 'submitted'), m(2, 'paid')]).tone).toBe('waiting');
  });

  it('asks for a review once complete, until one is written', () => {
    expect(nextAction('freelancer', c('completed'), []).target).toBe('#review');
    expect(nextAction('freelancer', c('completed'), [], [], [{ reviewer_role: 'freelancer' }]).tone).toBe('done');
  });

  it('surfaces open disputes', () => {
    expect(nextAction('client', c('disputed'), [m(1, 'disputed')], [{ id: 'd1', status: 'under_review' }]).target).toBe('/disputes/d1');
  });
});
