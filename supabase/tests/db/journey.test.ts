import { afterAll, describe, expect, it } from 'vitest';
import {
  activeContract, as, createOpenProject, createUser, deliverAndApprove, expectError, fundContract, milestonePlan,
  pool, randomTxHash, releaseMilestone, root, service, signedContract, submitProposal, verifyWallet,
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
  it('requires a verified wallet and the current terms, and cannot be repeated', async () => {
    const client = await createUser('Sign Client');
    const freelancer = await createUser('Sign Freelancer');
    const projectId = await createOpenProject(client);
    const contractId = await as(client).rpc<string>('accept_proposal', {
      p_proposal_id: await submitProposal(freelancer, projectId),
    });
    const [{ terms_hash }] = await root<{ terms_hash: string }>('select terms_hash from public.contracts where id = $1', [contractId]);

    await expectError(as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: terms_hash }), 'wallet_required');
    await verifyWallet(client);
    await expectError(as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: 'f'.repeat(64) }), 'terms_changed');
    expect(await as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: terms_hash })).toBe('pending_signatures');
    await expectError(as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client', p_terms_hash: terms_hash }), 'already_signed');

    await verifyWallet(freelancer);
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
  it('only accepts deposits from the client wallet for the exact total, once', async () => {
    const ctx = await signedContract([100, 200]);
    const wrongAmount = await fundContract(ctx.contractId, ctx.client, ctx.clientWallet, '299');
    const [failed] = await root<{ status: string }>('select status from public.escrow_transactions where id = $1', [wrongAmount]);
    expect(failed.status).toBe('failed');

    const wrongWallet = await fundContract(ctx.contractId, ctx.client, ctx.freelancerWallet);
    const [failed2] = await root<{ status: string }>('select status from public.escrow_transactions where id = $1', [wrongWallet]);
    expect(failed2.status).toBe('failed');

    const ok = await fundContract(ctx.contractId, ctx.client, ctx.clientWallet);
    // Applying the same confirmed transaction again changes nothing.
    await service().rpc('apply_escrow_funding', {
      p_tx_id: ok, p_block: 1, p_from: ctx.clientWallet, p_amount: '300', p_escrow_address: ctx.clientWallet, p_escrow_key: randomTxHash(),
    });
    const [c] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(c.status).toBe('active');
    const ms = await root<{ status: string; due_date: string | null }>('select status, due_date from public.milestones where contract_id = $1', [ctx.contractId]);
    expect(ms.every((m) => m.status === 'funded' && m.due_date)).toBe(true);
    const [stats] = await root<{ funded_as_client: number }>('select funded_as_client from public.profile_stats where id = $1', [ctx.client]);
    expect(stats.funded_as_client).toBe(1);
  });

  it('the apply functions are not callable by users', async () => {
    const ctx = await signedContract();
    const txId = await as(ctx.client).rpc<string>('report_escrow_tx', {
      p_contract_id: ctx.contractId, p_kind: 'fund', p_milestone_id: null, p_chain_id: 31337, p_tx_hash: randomTxHash(),
    });
    await expectError(as(ctx.client).rpc('apply_escrow_funding', {
      p_tx_id: txId, p_block: 1, p_from: ctx.clientWallet, p_amount: '300', p_escrow_address: ctx.clientWallet, p_escrow_key: randomTxHash(),
    }), 'permission denied for function apply_escrow_funding');
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

    const approval = await as(ctx.client).rpc<{ position: number }>('approve_milestone', { p_milestone_id: m1.id });
    expect(approval.position).toBe(1);
    // Approving again is a no-op that returns the same release instructions.
    expect((await as(ctx.client).rpc<{ position: number }>('approve_milestone', { p_milestone_id: m1.id })).position).toBe(1);

    const tx = await releaseMilestone(ctx.contractId, ctx.client, ctx.clientWallet, m1.id);
    // Replaying the release does not pay twice.
    await service().rpc('apply_escrow_release', { p_tx_id: tx, p_block: 2, p_from: ctx.clientWallet, p_position: 1, p_amount: m1.amount });
    const [paid] = await root<{ status: string; freelancer_payout: string }>('select status, freelancer_payout from public.milestones where id = $1', [m1.id]);
    expect(paid.status).toBe('paid');

    // A second release transaction for the same milestone is rejected.
    const second = await releaseMilestone(ctx.contractId, ctx.client, ctx.clientWallet, m1.id);
    const [rejected] = await root<{ status: string }>('select status from public.escrow_transactions where id = $1', [second]);
    expect(rejected.status).toBe('failed');

    await expectError(as(ctx.freelancer).rpc('submit_review', { p_contract_id: ctx.contractId, p_rating: 5, p_ratings: '{}', p_body: 'Great client to work with overall.' }), 'invalid_state');

    await deliverAndApprove(ctx, m2.id);
    await releaseMilestone(ctx.contractId, ctx.client, ctx.clientWallet, m2.id);
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
    const ctx = await activeContract([50]);
    const [m] = ctx.milestones;
    const txId = await as(ctx.freelancer).rpc<string>('report_escrow_tx', {
      p_contract_id: ctx.contractId, p_kind: 'refund', p_milestone_id: m.id, p_chain_id: 31337, p_tx_hash: randomTxHash(),
    });
    await expectError(as(ctx.client).rpc('report_escrow_tx', {
      p_contract_id: ctx.contractId, p_kind: 'refund', p_milestone_id: m.id, p_chain_id: 31337, p_tx_hash: randomTxHash(),
    }), 'forbidden');
    await service().rpc('apply_escrow_refund', { p_tx_id: txId, p_block: 3, p_from: ctx.freelancerWallet, p_position: 1, p_amount: m.amount });
    const [c] = await root<{ status: string }>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(c.status).toBe('completed');
  });
});
