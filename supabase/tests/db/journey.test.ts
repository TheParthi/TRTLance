import { afterAll, describe, expect, it } from 'vitest';
import {
  activeContract, as, balances, buyCoins, createOpenProject, createUser, deliverAndApprove, escrowBalance, expectError,
  fundContract, milestonePlan, pool, releaseMilestone, root, signedContract, submitProposal,
} from './helpers';

afterAll(() => pool.end());

describe('projects', () => {
  it('creates a draft, refuses to publish an incomplete one, then publishes', async () => {
    const client = await createUser('Draft Owner');
    const [draft] = await as(client).query<{ id: string; status: string }>(
      `insert into public.projects (client_id, title) values ($1, 'Short') returning id, status`, [client]);
    expect(draft.status).toBe('draft');
    await expectError(as(client).rpc('publish_project', { p_project_id: draft.id }), 'validation');

    const other = await createUser('Someone Else');
    const visible = await as(other).query('select id from public.projects where id = $1', [draft.id]);
    expect(visible).toHaveLength(0);

    const id = await createOpenProject(client);
    const [p] = await anonRead(id);
    expect(p.status).toBe('open');
  });

  it('rejects a milestone plan that does not add up to the budget', async () => {
    const client = await createUser('Plan Owner');
    const [draft] = await as(client).query<{ id: string }>(
      `insert into public.projects (client_id, title, description, category, skills, budget_amount, experience_level, milestone_plan)
       values ($1, 'A valid project title', 'A description that is definitely longer than thirty characters.',
               'design', '{figma}', 100, 'expert', $2) returning id`,
      [client, JSON.stringify([{ title: 'Design', amount: 60 }, { title: 'Handoff', amount: 30 }])]);
    await expectError(as(client).rpc('publish_project', { p_project_id: draft.id }), 'validation');
  });

  it('does not let clients write server-owned project columns', async () => {
    const client = await createUser('Column Owner');
    await expectError(
      as(client).query(`insert into public.projects (client_id, title, status) values ($1, 'x', 'open')`, [client]),
      'permission denied for table projects',
    );
    const id = await createOpenProject(client);
    // Published projects cannot be edited directly.
    const updated = await as(client).query(`update public.projects set budget_amount = 1 where id = $1 returning id`, [id]);
    expect(updated).toHaveLength(0);
  });
});

async function anonRead(id: string) {
  return as(null).query<{ status: string }>('select status from public.projects where id = $1', [id]);
}

describe('proposals', () => {
  it('validates milestone sums and blocks self-proposals and duplicates', async () => {
    const client = await createUser('Proposal Client');
    const freelancer = await createUser('Proposal Freelancer');
    const projectId = await createOpenProject(client);

    await expectError(as(client).rpc('submit_proposal', {
      p_project_id: projectId, p_cover_letter: 'x'.repeat(60), p_amount: 100, p_duration_days: 10,
      p_relevant_skills: [], p_milestones: JSON.stringify(milestonePlan([100])),
    }), 'forbidden');

    await expectError(as(freelancer).rpc('submit_proposal', {
      p_project_id: projectId, p_cover_letter: 'x'.repeat(60), p_amount: 100, p_duration_days: 10,
      p_relevant_skills: [], p_milestones: JSON.stringify(milestonePlan([40, 50])),
    }), 'validation');

    await expectError(as(freelancer).rpc('submit_proposal', {
      p_project_id: projectId, p_cover_letter: 'x'.repeat(60), p_amount: -5, p_duration_days: 10,
      p_relevant_skills: [], p_milestones: JSON.stringify(milestonePlan([-5])),
    }), 'validation');

    await submitProposal(freelancer, projectId);
    await expectError(submitProposal(freelancer, projectId), 'proposal_exists');

    const [project] = await root<{ proposal_count: number }>('select proposal_count from public.projects where id = $1', [projectId]);
    expect(project.proposal_count).toBe(1);

    const notes = await as(client).query<{ type: string; link: string }>('select type, link from public.notifications where user_id = $1', [client]);
    expect(notes.map((n) => n.type)).toContain('proposal.new');
    expect(notes[0].link).toBe(`/projects/${projectId}/proposals`);
  });

  it('cannot be inserted or accepted directly through the table', async () => {
    const client = await createUser('Direct Client');
    const freelancer = await createUser('Direct Freelancer');
    const projectId = await createOpenProject(client);
    await expectError(as(freelancer).query(
      `insert into public.proposals (project_id, freelancer_id, cover_letter, amount, duration_days, status)
       values ($1, $2, $3, 10, 5, 'accepted')`, [projectId, freelancer, 'x'.repeat(60)]),
    'permission denied for table proposals');
    const proposalId = await submitProposal(freelancer, projectId);
    await expectError(as(client).query(`update public.proposals set status = 'accepted' where id = $1`, [proposalId]),
      'permission denied for table proposals');
  });
});

describe('hiring', () => {
  it('accepting is idempotent and declines the other proposals', async () => {
    const client = await createUser('Hiring Client');
    const f1 = await createUser('First Freelancer');
    const f2 = await createUser('Second Freelancer');
    const projectId = await createOpenProject(client);
    const p1 = await submitProposal(f1, projectId);
    const p2 = await submitProposal(f2, projectId);

    const c1 = await as(client).rpc<string>('accept_proposal', { p_proposal_id: p1 });
    const again = await as(client).rpc<string>('accept_proposal', { p_proposal_id: p1 });
    expect(again).toBe(c1);
    await expectError(as(client).rpc('accept_proposal', { p_proposal_id: p2 }), 'project_closed');

    const contracts = await root('select id from public.contracts where project_id = $1', [projectId]);
    expect(contracts).toHaveLength(1);
    const [declined] = await root<{ status: string }>('select status from public.proposals where id = $1', [p2]);
    expect(declined.status).toBe('declined');
    const [project] = await root<{ status: string; hired_freelancer_id: string }>(
      'select status, hired_freelancer_id from public.projects where id = $1', [projectId]);
    expect(project).toEqual({ status: 'in_contract', hired_freelancer_id: f1 });
  });

  it('concurrent accepts of different proposals create exactly one contract', async () => {
    const client = await createUser('Race Client');
    const projectId = await createOpenProject(client);
    const proposals = await Promise.all(
      [1, 2, 3, 4].map(async (i) => submitProposal(await createUser(`Racer ${i}`), projectId)),
    );
    const results = await Promise.allSettled(
      proposals.map((id) => as(client).rpc<string>('accept_proposal', { p_proposal_id: id })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const contracts = await root('select id from public.contracts where project_id = $1', [projectId]);
    expect(contracts).toHaveLength(1);
  });

  it('only the project owner can accept', async () => {
    const client = await createUser('Owner');
    const freelancer = await createUser('Applicant');
    const stranger = await createUser('Stranger');
    const projectId = await createOpenProject(client);
    const proposalId = await submitProposal(freelancer, projectId);
    await expectError(as(stranger).rpc('accept_proposal', { p_proposal_id: proposalId }), 'not_found');
    await expectError(as(freelancer).rpc('accept_proposal', { p_proposal_id: proposalId }), 'not_found');
  });
});

describe('signing', () => {
  it('requires the current terms and cannot be repeated', async () => {
    const client = await createUser('Sign Client');
    const freelancer = await createUser('Sign Freelancer');
    const projectId = await createOpenProject(client);
    const contractId = await as(client).rpc<string>('accept_proposal', {
      p_proposal_id: await submitProposal(freelancer, projectId),
    });
    const [{ terms_hash }] = await root<{ terms_hash: string }>('select terms_hash from public.contracts where id = $1', [contractId]);

    await expectError(as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: 'f'.repeat(64) }), 'terms_changed');
    expect(await as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: terms_hash })).toBe('pending_signatures');
    await expectError(as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: terms_hash }), 'already_signed');

    expect(await as(freelancer).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Freelancer', p_terms_hash: terms_hash })).toBe('awaiting_funding');
  });

  it('lets either party cancel before funding and reopens the project', async () => {
    const ctx = await signedContract();
    await expectError(as(ctx.client).rpc('cancel_contract', { p_contract_id: ctx.contractId, p_reason: 'short' }), 'validation');
    await as(ctx.freelancer).rpc('cancel_contract', { p_contract_id: ctx.contractId, p_reason: 'Scope changed after the call.' });
    const [project] = await root<{ status: string }>('select status from public.projects where id = $1', [ctx.projectId]);
    expect(project.status).toBe('open');
  });
});

describe('funding', () => {
  it('locks exactly the total from the client wallet, once, and only for the client', async () => {
    const ctx = await signedContract([100, 200]);
    // The project budget (300) was bought when the project was posted; spend some elsewhere.
    await root(`with t as (insert into public.coin_transactions (kind, memo) values ('purchase', 'Spent elsewhere') returning id)
                select app.move_coins((select id from t), app.coin_account('wallet', $1), app.coin_account('gateway'), 250)`, [ctx.client]);
    const short = await expectError(fundContract(ctx.contractId, ctx.client), 'insufficient_coins');
    expect(short.detail).toContain('250 more coins');
    await expectError(as(ctx.freelancer).rpc('fund_contract', { p_contract_id: ctx.contractId }), 'forbidden');

    await buyCoins(ctx.client, 250);
    expect(await fundContract(ctx.contractId, ctx.client)).toBe('active');
    // Funding again changes nothing.
    expect(await fundContract(ctx.contractId, ctx.client)).toBe('active');
    expect(await escrowBalance(ctx.contractId)).toBe(300);
    expect((await balances(ctx.client)).wallet).toBe(0);

    const ms = await root<{ status: string; due_date: string | null }>('select status, due_date from public.milestones where contract_id = $1', [ctx.contractId]);
    expect(ms.every((m) => m.status === 'funded' && m.due_date)).toBe(true);
    const [stats] = await root<{ funded_as_client: number }>('select funded_as_client from public.profile_stats where id = $1', [ctx.client]);
    expect(stats.funded_as_client).toBe(1);
  });

  it('cannot be cancelled once coins are locked', async () => {
    const ctx = await activeContract([100]);
    await expectError(as(ctx.client).rpc('cancel_contract', { p_contract_id: ctx.contractId, p_reason: 'Changed my mind about it.' }), 'invalid_state');
  });
});

describe('milestones', () => {
  it('runs submit → revision → submit → approve → paid, and completes the contract', async () => {
    const ctx = await activeContract([100, 200]);
    const [m1, m2] = ctx.milestones;

    await expectError(as(ctx.client).rpc('submit_milestone', {
      p_milestone_id: m1.id, p_note: 'Not mine to submit', p_links: [], p_files: null,
    }), 'not_found');
    await expectError(as(ctx.client).rpc('approve_milestone', { p_milestone_id: m1.id }), 'invalid_state');

    await as(ctx.freelancer).rpc('submit_milestone', { p_milestone_id: m1.id, p_note: 'First version of the site', p_links: ['https://example.com/v1'], p_files: null });
    await as(ctx.client).rpc('request_revision', { p_milestone_id: m1.id, p_comment: 'Please fix the mobile menu.' });
    await as(ctx.freelancer).rpc('submit_milestone', { p_milestone_id: m1.id, p_note: 'Fixed the mobile menu', p_links: [], p_files: null });
    const versions = await root('select version from public.milestone_submissions where milestone_id = $1 order by version', [m1.id]);
    expect(versions).toEqual([{ version: 1 }, { version: 2 }]);

    const approval = await as(ctx.client).rpc<{ position: number; fee: number; net: number }>('approve_milestone', { p_milestone_id: m1.id });
    expect(approval).toMatchObject({ position: 1, fee: 10, net: 90 });
    // Approving or releasing again does not pay twice.
    expect(await as(ctx.client).rpc('approve_milestone', { p_milestone_id: m1.id })).toMatchObject({ already_paid: true });
    expect(await releaseMilestone(ctx.client, m1.id)).toMatchObject({ already_paid: true });
    const [paid] = await root<{ status: string; freelancer_payout: string; platform_fee: string }>(
      'select status, freelancer_payout, platform_fee from public.milestones where id = $1', [m1.id]);
    expect(paid.status).toBe('paid');
    expect(Number(paid.platform_fee)).toBe(10);
    expect(await balances(ctx.freelancer)).toEqual({ wallet: 0, pending: 90, earnings: 0 });
    expect(await escrowBalance(ctx.contractId)).toBe(200);

    await expectError(as(ctx.freelancer).rpc('submit_review', { p_contract_id: ctx.contractId, p_rating: 5, p_ratings: '{}', p_body: 'Great client to work with overall.' }), 'invalid_state');

    await deliverAndApprove(ctx, m2.id);
    const [c] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(c.status).toBe('completed');
    const [s] = await root<{ completed_as_freelancer: number; trust_credits: number }>(
      'select completed_as_freelancer, trust_credits from public.profile_stats where id = $1', [ctx.freelancer]);
    expect(s).toEqual({ completed_as_freelancer: 1, trust_credits: 20 });

    // Reviews: once per side, with validated category ratings.
    await expectError(as(ctx.client).rpc('submit_review', { p_contract_id: ctx.contractId, p_rating: 5, p_ratings: JSON.stringify({ clarity: 5 }), p_body: 'Excellent delivery and communication.' }), 'validation');
    await as(ctx.client).rpc('submit_review', { p_contract_id: ctx.contractId, p_rating: 5, p_ratings: JSON.stringify({ quality: 5, communication: 4 }), p_body: 'Excellent delivery and communication.' });
    await expectError(as(ctx.client).rpc('submit_review', { p_contract_id: ctx.contractId, p_rating: 5, p_ratings: '{}', p_body: 'Excellent delivery and communication.' }), 'already_reviewed');
    const [after] = await root<{ rating_avg: string; review_count: number; trust_credits: number }>(
      'select rating_avg, review_count, trust_credits from public.profile_stats where id = $1', [ctx.freelancer]);
    expect(after).toEqual({ rating_avg: '5.00', review_count: 1, trust_credits: 30 });
  });

  it('a freelancer can voluntarily refund a funded milestone', async () => {
    const ctx = await activeContract([150]);
    const [m] = ctx.milestones;
    await expectError(as(ctx.client).rpc('refund_milestone', { p_milestone_id: m.id }), 'forbidden');
    await as(ctx.freelancer).rpc('refund_milestone', { p_milestone_id: m.id });
    await expectError(as(ctx.freelancer).rpc('refund_milestone', { p_milestone_id: m.id }), 'invalid_state');
    expect((await balances(ctx.client)).wallet).toBe(150);
    expect(await escrowBalance(ctx.contractId)).toBe(0);
    const [c] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(c.status).toBe('completed');
  });

  it('only the client releases, and only while the contract is funded', async () => {
    const ctx = await activeContract([100, 200]);
    await expectError(as(ctx.freelancer).rpc('release_milestone', { p_milestone_id: ctx.milestones[0].id }), 'not_found');
    // A client may pay a milestone early, before any submission.
    await releaseMilestone(ctx.client, ctx.milestones[1].id);
    expect((await balances(ctx.freelancer)).pending).toBe(180);
  });
});
