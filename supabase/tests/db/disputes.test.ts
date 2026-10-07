import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  activeContract, as, balances, createUser, deliverAndApprove, escrowBalance, expectError, makeAdmin, pool, releaseMilestone, root,
} from './helpers';

afterAll(() => pool.end());

async function approvedArbitrator(name = 'Arbiter') {
  const uid = await createUser(name);
  await root(
    `insert into public.arbitrators (user_id, status, specializations, statement, capacity, is_available)
     values ($1, 'approved', '{web-development}', $2, 3, true)`,
    [uid, 'Ten years of software delivery and code review experience across many teams.'],
  );
  return uid;
}

const description = 'The delivered site does not match the agreed design and the contact form does not send email.';

async function openDispute(ctx: { contractId: string; client: string }, milestoneId: string, key?: string) {
  return as(ctx.client).rpc<string>('open_dispute', {
    p_contract_id: ctx.contractId,
    p_milestone_id: milestoneId,
    p_reason: 'quality',
    p_description: description,
    p_requested_outcome: 'partial',
    p_requested_freelancer_pct: 40,
    p_idempotency_key: key ?? null,
  });
}

describe('opening a dispute', () => {
  it('freezes the milestone, assigns a conflict-free arbitrator and is idempotent', async () => {
    const arbiter = await approvedArbitrator();
    const ctx = await activeContract([100, 200]);
    const [m1] = ctx.milestones;
    await as(ctx.freelancer).rpc('submit_milestone', { p_milestone_id: m1.id, p_note: 'Delivered version one', p_links: [], p_files: null });

    const key = randomUUID();
    const id = await openDispute(ctx, m1.id, key);
    expect(await openDispute(ctx, m1.id, key)).toBe(id);
    await expectError(openDispute(ctx, m1.id), 'invalid_state');

    const [d] = await root<{ status: string; arbitrator_id: string; amount: string }>(
      'select status, arbitrator_id, amount from public.disputes where id = $1', [id]);
    expect(d.status).toBe('awaiting_evidence');
    expect(d.arbitrator_id).toBe(arbiter);
    const [m] = await root<{ status: string; status_before_dispute: string }>('select status, status_before_dispute from public.milestones where id = $1', [m1.id]);
    expect(m).toEqual({ status: 'disputed', status_before_dispute: 'submitted' });

    // Disputed work cannot be approved or released.
    await expectError(as(ctx.client).rpc('approve_milestone', { p_milestone_id: m1.id }), 'invalid_state');
    await expectError(releaseMilestone(ctx.client, m1.id), 'invalid_state');
    await expectError(as(ctx.freelancer).rpc('refund_milestone', { p_milestone_id: m1.id }), 'invalid_state');

    // The arbitrator can read the contract; a stranger cannot read the dispute.
    expect(await as(arbiter).query('select id from public.contracts where id = $1', [ctx.contractId])).toHaveLength(1);
    const stranger = await createUser('Dispute Stranger');
    expect(await as(stranger).query('select id from public.disputes where id = $1', [id])).toHaveLength(0);
    await expectError(as(stranger).query(`insert into public.dispute_messages (dispute_id, sender_id, body) values ($1, $2, 'hi')`, [id, stranger]),
      'new row violates row-level security policy for table "dispute_messages"');
  });

  it('only parties can open disputes, only on funded milestones', async () => {
    const ctx = await activeContract([100]);
    const stranger = await createUser('Outsider');
    await expectError(as(stranger).rpc('open_dispute', {
      p_contract_id: ctx.contractId, p_milestone_id: ctx.milestones[0].id, p_reason: 'quality', p_description: description,
      p_requested_outcome: 'refund', p_requested_freelancer_pct: null, p_idempotency_key: null,
    }), 'not_found');
  });

  it('never assigns an arbitrator who has worked with a party', async () => {
    const ctx = await activeContract([100]);
    // Make the only available arbitrator someone who previously contracted with this client.
    await root(`update public.arbitrators set is_available = false`);
    const conflicted = await approvedArbitrator('Conflicted Arbiter');
    const earlier = await activeContract([100]);
    await root('update public.contracts set freelancer_id = $1 where id = $2', [conflicted, earlier.contractId]);
    await root('update public.contracts set client_id = $1 where id = $2', [ctx.client, earlier.contractId]);
    const id = await openDispute(ctx, ctx.milestones[0].id);
    const [d] = await root<{ status: string; arbitrator_id: string | null }>('select status, arbitrator_id from public.disputes where id = $1', [id]);
    expect(d).toEqual({ status: 'open', arbitrator_id: null });
    await root(`update public.arbitrators set is_available = false where user_id = $1`, [conflicted]);
  });
});

describe('deciding and settling', () => {
  it('lets only the assigned arbitrator decide and settles exactly the decided split', async () => {
    await root(`update public.arbitrators set is_available = false`);
    const arbiter = await approvedArbitrator('Decider');
    const ctx = await activeContract([100, 200]);
    const [m1, m2] = ctx.milestones;
    const id = await openDispute(ctx, m1.id);

    await expectError(as(ctx.client).rpc('decide_dispute', { p_dispute_id: id, p_decision: 'client', p_freelancer_pct: null, p_reason: 'x'.repeat(60) }), 'forbidden');
    await as(arbiter).rpc('start_dispute_review', { p_dispute_id: id });
    await expectError(as(arbiter).rpc('decide_dispute', { p_dispute_id: id, p_decision: 'partial', p_freelancer_pct: 100, p_reason: 'x'.repeat(60) }), 'validation');
    await expectError(as(arbiter).rpc('decide_dispute', { p_dispute_id: id, p_decision: 'partial', p_freelancer_pct: 40, p_reason: 'too short' }), 'validation');
    await as(arbiter).rpc('decide_dispute', {
      p_dispute_id: id, p_decision: 'partial', p_freelancer_pct: 40,
      p_reason: 'Design mismatch is documented, but most pages were delivered as agreed in the brief.',
    });
    await expectError(as(arbiter).rpc('decide_dispute', { p_dispute_id: id, p_decision: 'client', p_freelancer_pct: null, p_reason: 'x'.repeat(60) }), 'invalid_state');

    // The decision settles immediately: 40 to the freelancer (less the 10% fee), 60 back to the client.
    const [d] = await root<{ settlement_status: string }>('select settlement_status from public.disputes where id = $1', [id]);
    expect(d.settlement_status).toBe('settled');
    const [m] = await root<{ status: string; freelancer_payout: string; client_refund: string; platform_fee: string }>(
      'select status, freelancer_payout, client_refund, platform_fee from public.milestones where id = $1', [m1.id]);
    expect(m.status).toBe('settled');
    expect(Number(m.freelancer_payout)).toBe(40);
    expect(Number(m.client_refund)).toBe(60);
    expect(Number(m.platform_fee)).toBe(4);
    expect((await balances(ctx.freelancer)).pending).toBe(36);
    expect((await balances(ctx.client)).wallet).toBe(60);
    expect(await escrowBalance(ctx.contractId)).toBe(200);
    const [c] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(c.status).toBe('active');

    const events = await as(ctx.client).query<{ type: string }>('select type from public.dispute_events where dispute_id = $1 order by id', [id]);
    expect(events.map((e) => e.type)).toEqual(['dispute.opened', 'dispute.assigned', 'dispute.review_started', 'dispute.decided', 'dispute.settled']);
    await expectError(root('update public.dispute_events set type = $1 where dispute_id = $2', ['tampered', id]), 'immutable');

    await deliverAndApprove(ctx, m2.id);
    const [done] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(done.status).toBe('completed');
  });

  it('records the losing party and escalation goes to admins', async () => {
    await root(`update public.arbitrators set is_available = false`);
    const ctx = await activeContract([100]);
    const id = await openDispute(ctx, ctx.milestones[0].id);
    await expectError(as(ctx.client).rpc('escalate_dispute', { p_dispute_id: id, p_reason: 'Nobody has picked this up.' }), 'forbidden');
    await root(`update public.disputes set created_at = now() - interval '3 days' where id = $1`, [id]);
    const admin = await makeAdmin('Escalation Admin');
    await as(ctx.client).rpc('escalate_dispute', { p_dispute_id: id, p_reason: 'Nobody has picked this up.' });
    const notes = await as(admin).query<{ type: string }>('select type from public.notifications');
    expect(notes.map((n) => n.type)).toContain('dispute.escalated');
    await as(admin).rpc('decide_dispute', {
      p_dispute_id: id, p_decision: 'client', p_freelancer_pct: null,
      p_reason: 'No work was delivered by the deadline and the freelancer did not respond to messages.',
    });
    const [s] = await root<{ disputes_lost: number }>('select disputes_lost from public.profile_stats where id = $1', [ctx.freelancer]);
    expect(s.disputes_lost).toBe(1);
  });
});

describe('arbitrator programme', () => {
  it('reports eligibility and refuses ineligible applications', async () => {
    const uid = await createUser('Hopeful');
    const result = await as(uid).rpc<{ eligible: boolean; checks: { key: string; met: boolean }[] }>('arbitrator_eligibility');
    expect(result.eligible).toBe(false);
    expect(result.checks.map((c) => c.key)).toEqual(['contracts', 'rating', 'disputes', 'identity', 'age']);
    await expectError(as(uid).rpc('apply_as_arbitrator', {
      p_specializations: ['design'], p_statement: 'x'.repeat(60), p_capacity: 2,
    }), 'not_eligible');
    await expectError(as(uid).rpc('admin_review_arbitrator', { p_user_id: uid, p_approve: true, p_note: null }), 'forbidden');
  });
});
