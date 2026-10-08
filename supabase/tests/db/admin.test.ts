import { describe, expect, it } from 'vitest';
import {
  activeContract, as, anon, balances, buyCoins, createOpenProject, createUser, deliverAndApprove,
  expectError, makeAdmin, root, service, verifiedBankAccount,
} from './helpers';

/**
 * The admin console never reads tables directly — row-level security does not give admins blanket
 * access. Every screen goes through a function here, so these tests check two things for each one:
 * that it refuses anyone who is not an admin, and that what it returns is actually true.
 */

type Row = Record<string, string | number | boolean | null>;

const rows = (uid: string | null, sql: string, params: unknown[] = []) => as(uid).query<Row>(sql, params);

describe('who can use the admin functions', () => {
  const READS = [
    'select * from public.admin_overview()',
    'select * from public.admin_timeseries(7)',
    'select * from public.admin_member_list()',
    'select * from public.admin_project_list()',
    'select * from public.admin_contract_list()',
    'select * from public.admin_dispute_list()',
    'select * from public.admin_finance()',
    'select * from public.admin_coin_ledger()',
    'select * from public.admin_arbitrator_list()',
    'select * from public.admin_audit_list()',
    'select * from public.admin_configuration()',
  ];

  it('refuses a signed-in member who is not an admin', async () => {
    const member = await createUser('Curious Member');
    for (const sql of READS) await expectError(rows(member, sql), 'forbidden');
  });

  it('refuses a visitor with no session', async () => {
    // The grant stops them before the function body runs, so the message names the function.
    for (const sql of READS) {
      const fn = sql.match(/public\.(\w+)\(/)![1];
      await expectError(anon().query(sql), `permission denied for function ${fn}`);
    }
  });

  it('lets an admin through', async () => {
    const admin = await makeAdmin();
    for (const sql of READS) await expect(rows(admin, sql)).resolves.toBeDefined();
  });

  it('refuses every write to a member who is not an admin', async () => {
    const member = await createUser('Curious Member');
    const victim = await createUser('Other Member');
    await expectError(as(member).rpc('admin_set_member_suspended', { p_user: victim, p_suspend: true, p_reason: 'Because I said so.' }), 'forbidden');
    await expectError(as(member).rpc('admin_set_admin_role', { p_user: member, p_grant: true, p_note: null }), 'forbidden');
    await expectError(as(member).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: 0 }), 'forbidden');
    await expectError(as(member).rpc('admin_set_holiday', { p_day: '2027-01-26', p_label: 'Republic Day' }), 'forbidden');
    await expectError(as(member).rpc('admin_remove_holiday', { p_day: '2027-01-26' }), 'forbidden');
    await expectError(as(member).rpc('admin_record_entry', { p_detail: {} }), 'forbidden');
  });

  it('keeps the audit log out of reach of direct reads', async () => {
    const member = await createUser('Curious Member');
    await expectError(as(member).query('select * from public.admin_audit_log'), 'permission denied for table admin_audit_log');
    await expectError(anon().query('select * from public.admin_audit_log'), 'permission denied for table admin_audit_log');
  });
});

describe('suspending a member', () => {
  it('stops every write but leaves reading alone', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Suspended Client');
    await buyCoins(client, 500);

    await as(admin).rpc('admin_set_member_suspended', {
      p_user: client, p_suspend: true, p_reason: 'Posted the same brief eleven times.',
    });

    // Reading their own account still works.
    const [profile] = await as(client).query<Row>('select suspended_at, suspended_reason from public.profiles where id = $1', [client]);
    expect(profile.suspended_at).not.toBeNull();
    expect(profile.suspended_reason).toBe('Posted the same brief eleven times.');

    // Writes anywhere in the product are refused, because they all pass through app.require_user().
    await expectError(as(client).rpc('publish_project', { p_project_id: '00000000-0000-0000-0000-000000000000' }), 'account_suspended');
    await expectError(as(client).rpc('request_withdrawal', { p_coins: 500, p_idempotency_key: null }), 'account_suspended');
    await expectError(as(client).rpc('save_payout_account', {
      p_holder: 'Suspended Client', p_account_number: '123456789012', p_ifsc: 'HDFC0001234', p_pan: 'ABCDE1234F',
    }), 'account_suspended');
  });

  it('tells the member why, and lets them back in when reinstated', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Reinstated Member');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'Under review for payment fraud.' });

    const notes = await root<Row>(
      `select type, severity, body from public.notifications where user_id = $1 and type = 'account.suspended'`, [member]);
    expect(notes).toHaveLength(1);
    expect(notes[0].severity).toBe('critical');
    expect(notes[0].body).toBe('Under review for payment fraud.');

    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: false, p_reason: null });
    const [after] = await root<Row>('select suspended_at, suspended_reason, suspended_by from public.profiles where id = $1', [member]);
    expect(after.suspended_at).toBeNull();
    expect(after.suspended_reason).toBeNull();
    expect(after.suspended_by).toBeNull();

    // And they can write again.
    await expect(as(member).rpc('save_payout_account', {
      p_holder: 'Reinstated Member', p_account_number: '123456789012', p_ifsc: 'HDFC0001234', p_pan: 'ABCDE1234F',
    })).resolves.toBeDefined();
  });

  it('needs a real reason, and refuses the pointless cases', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Some Member');
    await expectError(as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'spam' }), 'validation');
    await expectError(as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: false, p_reason: null }), 'invalid_state');
    await expectError(as(admin).rpc('admin_set_member_suspended', {
      p_user: '00000000-0000-0000-0000-000000000000', p_suspend: true, p_reason: 'Does not exist at all.',
    }), 'not_found');

    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'A good enough reason.' });
    await expectError(as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'A good enough reason.' }), 'invalid_state');
  });

  it('will not let an admin suspend themselves or another admin', async () => {
    const admin = await makeAdmin();
    const other = await makeAdmin('Second Admin');
    await expectError(as(admin).rpc('admin_set_member_suspended', { p_user: admin, p_suspend: true, p_reason: 'A moment of weakness.' }), 'forbidden');
    await expectError(as(admin).rpc('admin_set_member_suspended', { p_user: other, p_suspend: true, p_reason: 'Disagreed with me once.' }), 'forbidden');
  });

  it('records the suspension in the audit log', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Audited Member');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'Opened disputes on every contract.' });

    const [entry] = await rows(admin, `select action, subject_type, subject_id, detail, actor_id
                                         from public.admin_audit_list('member.suspended', 'member', 10, 0)`);
    expect(entry.action).toBe('member.suspended');
    expect(entry.subject_id).toBe(member);
    expect(entry.actor_id).toBe(admin);
    expect(entry.detail).toMatchObject({ reason: 'Opened disputes on every contract.' });
  });
});

describe('the admin role', () => {
  it('is granted and revoked by another admin, never by yourself', async () => {
    const admin = await makeAdmin();
    await makeAdmin('Spare Admin');
    const member = await createUser('Promoted Member');

    await expectError(as(admin).rpc('admin_set_admin_role', { p_user: admin, p_grant: false, p_note: null }), 'forbidden');

    await as(admin).rpc('admin_set_admin_role', { p_user: member, p_grant: true, p_note: 'Runs the support rota.' });
    expect(await root('select 1 from public.platform_admins where user_id = $1', [member])).toHaveLength(1);
    await expectError(as(admin).rpc('admin_set_admin_role', { p_user: member, p_grant: true, p_note: null }), 'invalid_state');

    await as(member).rpc('admin_set_admin_role', { p_user: admin, p_grant: false, p_note: null });
    expect(await root('select 1 from public.platform_admins where user_id = $1', [admin])).toHaveLength(0);
  });

  it('never leaves the platform without an admin', async () => {
    // A fresh database has no admins, so the two here are the only ones.
    await root('delete from public.platform_admins');
    const a = await makeAdmin('Only Admin A');
    const b = await makeAdmin('Only Admin B');
    await as(a).rpc('admin_set_admin_role', { p_user: b, p_grant: false, p_note: null });
    await expectError(as(b).rpc('admin_set_admin_role', { p_user: a, p_grant: false, p_note: null }), 'forbidden');

    const c = await makeAdmin('Only Admin C');
    await root('delete from public.platform_admins where user_id <> $1', [c]);
    const member = await createUser('Nobody');
    await root('insert into public.platform_admins (user_id) values ($1)', [member]);
    await as(c).rpc('admin_set_admin_role', { p_user: member, p_grant: false, p_note: null });
    await expectError(as(c).rpc('admin_set_admin_role', { p_user: c, p_grant: false, p_note: null }), 'forbidden');
  });

  it('will not promote a suspended member', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Suspended Hopeful');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'Still under review.' });
    await expectError(as(admin).rpc('admin_set_admin_role', { p_user: member, p_grant: true, p_note: null }), 'invalid_state');
  });
});

describe('moderating a project', () => {
  it('hides a removed project from everyone but its client and admins', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Project Owner');
    const stranger = await createUser('Passing Freelancer');
    const projectId = await createOpenProject(client);

    expect(await rows(stranger, 'select id from public.projects where id = $1', [projectId])).toHaveLength(1);
    expect(await anon().query('select id from public.projects where id = $1', [projectId])).toHaveLength(1);

    await as(admin).rpc('admin_moderate_project', {
      p_project: projectId, p_state: 'removed', p_reason: 'The brief asks for work outside the law.',
    });

    expect(await rows(stranger, 'select id from public.projects where id = $1', [projectId])).toHaveLength(0);
    expect(await anon().query('select id from public.projects where id = $1', [projectId])).toHaveLength(0);
    // The client still sees it, with the reason.
    const [own] = await rows(client, 'select moderation_state, moderation_reason from public.projects where id = $1', [projectId]);
    expect(own.moderation_state).toBe('removed');
    expect(own.moderation_reason).toBe('The brief asks for work outside the law.');
    // And so does an admin.
    expect(await rows(admin, 'select id from public.projects where id = $1', [projectId])).toHaveLength(1);
    // It is gone from search too.
    const found = await rows(stranger, `select id from public.search_projects(p_query => 'marketing website')`);
    expect(found.map((r) => r.id)).not.toContain(projectId);
  });

  it('restores a project without the client having to republish it', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Project Owner');
    const stranger = await createUser('Passing Freelancer');
    const projectId = await createOpenProject(client);
    const [before] = await root<Row>('select visibility, status from public.projects where id = $1', [projectId]);

    await as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'removed', p_reason: 'Looked like a scam at first glance.' });
    await as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'ok', p_reason: null });

    const [after] = await root<Row>(
      'select visibility, status, moderation_state, moderation_reason, moderated_at, moderated_by from public.projects where id = $1',
      [projectId]);
    expect(after.visibility).toBe(before.visibility);
    expect(after.status).toBe(before.status);
    expect(after.moderation_state).toBe('ok');
    expect(after.moderation_reason).toBeNull();
    expect(after.moderated_at).toBeNull();
    expect(after.moderated_by).toBeNull();
    expect(await rows(stranger, 'select id from public.projects where id = $1', [projectId])).toHaveLength(1);
  });

  it('leaves a contract that came from the project alone', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await as(admin).rpc('admin_moderate_project', {
      p_project: ctx.projectId, p_state: 'removed', p_reason: 'Reported after the work had already started.',
    });
    // The money and the contract are governed by the contract, not the listing.
    const [contract] = await root<Row>('select status from public.contracts where id = $1', [ctx.contractId]);
    expect(contract.status).toBe('active');
    expect(await rows(ctx.freelancer, 'select id from public.contracts where id = $1', [ctx.contractId])).toHaveLength(1);
  });

  it('needs a reason to flag or remove, and refuses a no-op', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Project Owner');
    const projectId = await createOpenProject(client);
    await expectError(as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'removed', p_reason: 'spam' }), 'validation');
    await expectError(as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'nonsense', p_reason: 'A good long reason.' }), 'validation');
    await expectError(as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'ok', p_reason: null }), 'invalid_state');
    await expectError(as(admin).rpc('admin_moderate_project', {
      p_project: '00000000-0000-0000-0000-000000000000', p_state: 'flagged', p_reason: 'A good long reason.',
    }), 'not_found');
  });

  it('tells the client, and writes the change to the audit log', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Project Owner');
    const projectId = await createOpenProject(client);
    await as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'flagged', p_reason: 'The scope is too vague to price.' });

    const notes = await root<Row>(`select type, body, severity from public.notifications where user_id = $1 and type = 'project.flagged'`, [client]);
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe('The scope is too vague to price.');

    const [entry] = await rows(admin, `select action, subject_id, detail from public.admin_audit_list(null, 'project', 10, 0)`);
    expect(entry.action).toBe('project.moderated');
    expect(entry.subject_id).toBe(projectId);
    expect(entry.detail).toMatchObject({ from: 'ok', to: 'flagged' });
  });
});

describe('platform settings', () => {
  it('changes a setting and takes effect immediately', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: 1500 });
    const [row] = await root<Row>(`select value from public.platform_settings where key = 'fee_bps'`);
    expect(Number(row.value)).toBe(1500);

    // A new contract picks up the new fee.
    const ctx = await activeContract([100]);
    const [contract] = await root<Row>('select fee_bps from public.contracts where id = $1', [ctx.contractId]);
    expect(contract.fee_bps).toBe(1500);

    await as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: 1000 });
  });

  it('refuses values that would break the product', async () => {
    const admin = await makeAdmin();
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: 10000 }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: -1 }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'hold_working_days', p_value: 400 }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'auto_release_days', p_value: 0 }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'paise_per_coin', p_value: 10.5 }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'not_a_setting', p_value: 1 }), 'not_found');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: null }), 'validation');
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'fee_bps', p_value: 1000 }), 'invalid_state');
  });

  it('keeps the purchase limits the right way round', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_update_setting', { p_key: 'max_purchase_coins', p_value: 2000 });
    // A smallest purchase above the largest one would make buying coins impossible.
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'min_purchase_coins', p_value: 5000 }), 'validation');
    await as(admin).rpc('admin_update_setting', { p_key: 'min_purchase_coins', p_value: 1500 });
    await expectError(as(admin).rpc('admin_update_setting', { p_key: 'max_purchase_coins', p_value: 1200 }), 'validation');

    // Put both back, so the rest of the suite can buy coins.
    await as(admin).rpc('admin_update_setting', { p_key: 'min_purchase_coins', p_value: 100 });
    await as(admin).rpc('admin_update_setting', { p_key: 'max_purchase_coins', p_value: 500000 });
  });

  it('records every change with the value it replaced', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_update_setting', { p_key: 'min_withdrawal_coins', p_value: 1000 });
    const [entry] = await rows(admin, `select action, subject_id, detail from public.admin_audit_list('setting.changed', null, 10, 0)`);
    expect(entry.subject_id).toBe('min_withdrawal_coins');
    expect(entry.detail).toMatchObject({ from: 500, to: 1000 });
    await as(admin).rpc('admin_update_setting', { p_key: 'min_withdrawal_coins', p_value: 500 });
  });
});

describe('working-day holidays', () => {
  it('adds, renames and removes a holiday, and moves payment holds', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_set_holiday', { p_day: '2027-01-26', p_label: 'Republic Day' });
    const [added] = await root<Row>(`select label from public.holidays where day = '2027-01-26'`);
    expect(added.label).toBe('Republic Day');

    await as(admin).rpc('admin_set_holiday', { p_day: '2027-01-26', p_label: 'Republic Day (holiday)' });
    const [renamed] = await root<Row>(`select label from public.holidays where day = '2027-01-26'`);
    expect(renamed.label).toBe('Republic Day (holiday)');

    // A holiday is not a working day, so one working day from the 25th skips it.
    const [skip] = await root<Row>(
      `select to_char(app.add_working_days('2027-01-25'::date, 1), 'YYYY-MM-DD') as day`);
    expect(skip.day).toBe('2027-01-27');

    await as(admin).rpc('admin_remove_holiday', { p_day: '2027-01-26' });
    expect(await root(`select 1 from public.holidays where day = '2027-01-26'`)).toHaveLength(0);
    await expectError(as(admin).rpc('admin_remove_holiday', { p_day: '2027-01-26' }), 'not_found');
  });

  it('needs a date and a name', async () => {
    const admin = await makeAdmin();
    await expectError(as(admin).rpc('admin_set_holiday', { p_day: null, p_label: 'Nameless' }), 'validation');
    await expectError(as(admin).rpc('admin_set_holiday', { p_day: '2027-03-01', p_label: 'x' }), 'validation');
  });
});

describe('what the console shows', () => {
  it('counts members, projects, contracts and disputes', async () => {
    const admin = await makeAdmin();
    const before = await as(admin).rpc<Record<string, Record<string, number>>>('admin_overview');
    const ctx = await activeContract([100, 200]);
    const after = await as(admin).rpc<Record<string, Record<string, number>>>('admin_overview');

    expect(after.members.total).toBe(before.members.total + 2);
    expect(after.projects.in_contract).toBe(before.projects.in_contract + 1);
    expect(after.contracts.active).toBe(before.contracts.active + 1);
    expect(Number(after.money.escrow)).toBe(Number(before.money.escrow) + 300);
    expect(new Date(String(after.generated_at)).getTime()).toBeGreaterThan(0);
    expect(ctx.contractId).toBeTruthy();
  });

  it('sizes the action queues the console puts in front of the team', async () => {
    const admin = await makeAdmin();
    const before = await as(admin).rpc<{ queues: Record<string, number> }>('admin_overview');

    // A 1,000-coin milestone pays out 900 after the 10% fee, which clears the withdrawal minimum.
    const ctx = await activeContract([1000, 200]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);
    await root(`update public.coin_holds set available_on = current_date - 1 where user_id = $1`, [ctx.freelancer]);
    await verifiedBankAccount(ctx.freelancer, admin);
    await as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 900, p_idempotency_key: null });

    const after = await as(admin).rpc<{ queues: Record<string, number> }>('admin_overview');
    expect(Number(after.queues.withdrawals) - Number(before.queues.withdrawals)).toBe(1);
    expect(Number(after.queues.withdrawals_coins) - Number(before.queues.withdrawals_coins)).toBe(900);

    // And the queue function agrees with the count the overview reports.
    const queue = await rows(admin, 'select id, coins from public.admin_withdrawal_queue()');
    expect(queue).toHaveLength(Number(after.queues.withdrawals));
  });

  it('returns one row per day, with no gaps', async () => {
    const admin = await makeAdmin();
    await createUser('Today Member');
    const series = await rows(admin, 'select * from public.admin_timeseries(7)');
    expect(series).toHaveLength(7);
    expect(Number(series[6].signups)).toBeGreaterThan(0);
    expect(new Set(series.map((r) => String(r.day))).size).toBe(7);
    // The window is clamped, so a silly number cannot ask for a million rows.
    expect(await rows(admin, 'select * from public.admin_timeseries(10000)')).toHaveLength(365);
    expect(await rows(admin, 'select * from public.admin_timeseries(0)')).toHaveLength(1);
  });

  it('finds a member by name, username or id, and reports their state', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    const [{ username }] = await root<Row>('select username from public.profiles where id = $1', [ctx.freelancer]);

    const byId = await rows(admin, 'select * from public.admin_member_list($1)', [ctx.freelancer]);
    expect(byId).toHaveLength(1);
    expect(byId[0].id).toBe(ctx.freelancer);
    expect(Number(byId[0].contracts)).toBe(1);
    expect(Number(byId[0].total_count)).toBe(1);

    const byUsername = await rows(admin, 'select * from public.admin_member_list($1)', [String(username)]);
    expect(byUsername.map((r) => r.id)).toContain(ctx.freelancer);

    const byName = await rows(admin, `select * from public.admin_member_list('Freelancer Person')`);
    expect(byName.map((r) => r.id)).toContain(ctx.freelancer);
  });

  it('filters members by suspension, role and age, and pages without losing the count', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Filtered Member');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'For the filter test.' });

    const suspended = await rows(admin, `select * from public.admin_member_list(null, 'suspended')`);
    expect(suspended.map((r) => r.id)).toContain(member);
    expect(suspended.every((r) => r.suspended_at !== null)).toBe(true);

    const admins = await rows(admin, `select * from public.admin_member_list(null, 'admins')`);
    expect(admins.map((r) => r.id)).toContain(admin);
    expect(admins.every((r) => r.is_admin === true)).toBe(true);

    const page1 = await rows(admin, `select * from public.admin_member_list(null, 'all', 'recent', 1, 0)`);
    const page2 = await rows(admin, `select * from public.admin_member_list(null, 'all', 'recent', 1, 1)`);
    expect(page1).toHaveLength(1);
    expect(page2).toHaveLength(1);
    expect(page1[0].id).not.toBe(page2[0].id);
    expect(Number(page1[0].total_count)).toBe(Number(page2[0].total_count));
    expect(Number(page1[0].total_count)).toBeGreaterThan(1);
    // The page size is clamped.
    expect((await rows(admin, `select * from public.admin_member_list(null, 'all', 'recent', 9999, 0)`)).length).toBeLessThanOrEqual(100);
  });

  it('shows one member in full, including the facts only an admin needs', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await verifiedBankAccount(ctx.freelancer, admin);

    const detail = await as(admin).rpc<Record<string, unknown>>('admin_member_detail', { p_user: ctx.freelancer });
    const profile = detail.profile as Row;
    expect(profile.id).toBe(ctx.freelancer);
    expect(String(detail.email)).toContain('@example.test');
    expect(detail.is_admin).toBe(false);
    expect((detail.contracts as Row[])[0].id).toBe(ctx.contractId);
    expect((detail.contracts as Row[])[0].role).toBe('freelancer');
    expect((detail.payout_account as Row).status).toBe('verified');
    // The full account number and PAN are never in the payload.
    expect(JSON.stringify(detail)).not.toContain('123456789012');
    expect(JSON.stringify(detail)).not.toContain('ABCDE1234F');
    await expectError(as(admin).rpc('admin_member_detail', { p_user: '00000000-0000-0000-0000-000000000000' }), 'not_found');
  });

  it('lists projects with their moderation state and client', async () => {
    const admin = await makeAdmin();
    const client = await createUser('Listed Client');
    const projectId = await createOpenProject(client);
    await as(admin).rpc('admin_moderate_project', { p_project: projectId, p_state: 'flagged', p_reason: 'Checking the brief.' });

    const flagged = await rows(admin, `select * from public.admin_project_list(null, 'all', 'flagged')`);
    expect(flagged.map((r) => r.id)).toContain(projectId);
    const row = flagged.find((r) => r.id === projectId)!;
    expect(row.client_id).toBe(client);
    expect(row.client_name).toBe('Listed Client');
    expect(row.moderation_reason).toBe('Checking the brief.');

    const open = await rows(admin, `select * from public.admin_project_list(null, 'open', 'all')`);
    expect(open.every((r) => r.status === 'open')).toBe(true);
    const searched = await rows(admin, `select * from public.admin_project_list('marketing website')`);
    expect(searched.map((r) => r.id)).toContain(projectId);
  });

  it('lists contracts with the escrow still locked on each one', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);

    const active = await rows(admin, `select * from public.admin_contract_list(null, 'active')`);
    const row = active.find((r) => r.id === ctx.contractId)!;
    expect(row).toBeDefined();
    expect(Number(row.escrow)).toBe(300);
    expect(Number(row.milestones)).toBe(2);
    expect(Number(row.paid_milestones)).toBe(0);
    expect(row.client_name).toBe('Client Person');
    expect(row.freelancer_name).toBe('Freelancer Person');

    await deliverAndApprove(ctx, ctx.milestones[0].id);
    const after = await rows(admin, `select * from public.admin_contract_list($1)`, [ctx.contractId]);
    expect(Number(after[0].escrow)).toBe(200);
    expect(Number(after[0].paid_milestones)).toBe(1);
  });

  it('shows one contract with its milestones, events and escrow movements', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);

    const detail = await as(admin).rpc<Record<string, unknown>>('admin_contract_detail', { p_contract: ctx.contractId });
    expect((detail.contract as Row).id).toBe(ctx.contractId);
    expect((detail.client as Row).display_name).toBe('Client Person');
    expect(Number(detail.escrow_balance)).toBe(200);
    expect(detail.milestones as Row[]).toHaveLength(2);
    expect((detail.milestones as Row[])[0].status).toBe('paid');
    expect((detail.events as Row[]).length).toBeGreaterThan(0);
    expect((detail.ledger as Row[]).length).toBeGreaterThan(0);
    await expectError(as(admin).rpc('admin_contract_detail', { p_contract: '00000000-0000-0000-0000-000000000000' }), 'not_found');
  });

  it('lists disputes, and the attention filter matches the overview queue', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await as(ctx.client).rpc('open_dispute', {
      p_contract_id: ctx.contractId,
      p_milestone_id: ctx.milestones[0].id,
      p_reason: 'quality',
      p_description: 'The delivered page does not match the agreed design in several places.',
      p_requested_outcome: 'refund',
      p_requested_freelancer_pct: null,
      p_idempotency_key: null,
    });

    const attention = await rows(admin, `select * from public.admin_dispute_list('attention')`);
    const overview = await as(admin).rpc<{ queues: Record<string, number> }>('admin_overview');
    expect(attention.length).toBe(Number(overview.queues.attention));
    const row = attention.find((r) => r.contract_id === ctx.contractId)!;
    expect(row).toBeDefined();
    expect(row.contract_title).toBe('Build a marketing website');
    expect(row.client_name).toBe('Client Person');
    expect(row.arbitrator_name).toBeNull();
    expect(Number(row.milestone_position)).toBe(1);

    const live = await rows(admin, `select * from public.admin_dispute_list('live')`);
    expect(live.map((r) => r.contract_id)).toContain(ctx.contractId);
  });

  it('lists arbitrators with their case load', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);
    const arbitrator = await createUser('Would-be Arbitrator');
    await root(`update public.profile_stats set completed_as_freelancer = 5, trust_credits = 100 where id = $1`, [arbitrator]);
    await root(`insert into public.arbitrators (user_id, status, specializations, statement, capacity)
                values ($1, 'approved', '{web-development}', $2, 3)`,
      [arbitrator, 'I have resolved disputes on software projects for several years and understand scope arguments.']);

    const list = await rows(admin, `select * from public.admin_arbitrator_list('approved')`);
    const row = list.find((r) => r.user_id === arbitrator)!;
    expect(row).toBeDefined();
    expect(row.display_name).toBe('Would-be Arbitrator');
    expect(Number(row.live_cases)).toBe(0);
    expect(Number(row.capacity)).toBe(3);
  });

  it('shows settings, holidays and the admin roster together', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_set_holiday', { p_day: '2027-08-15', p_label: 'Independence Day' });
    const config = await as(admin).rpc<Record<string, Row[]>>('admin_configuration');
    expect(config.settings.map((s) => s.key)).toContain('fee_bps');
    expect(config.holidays.map((h) => String(h.day))).toContain('2027-08-15');
    expect(config.admins.map((a) => a.user_id)).toContain(admin);
    expect(String(config.admins.find((a) => a.user_id === admin)!.email)).toContain('@example.test');
    expect(config.categories.length).toBeGreaterThan(0);
    await as(admin).rpc('admin_remove_holiday', { p_day: '2027-08-15' });
  });
});

describe('the money screen', () => {
  it('reports where every coin sits, and finds no drift in a healthy ledger', async () => {
    const admin = await makeAdmin();
    const read = async () => {
      const f = await as(admin).rpc<Record<string, Record<string, unknown>>>('admin_finance');
      const kinds = (f.accounts as unknown as Row[]).reduce<Record<string, number>>((acc, a) => {
        acc[String(a.kind)] = Number(a.balance);
        return acc;
      }, {});
      return { f, kinds };
    };
    const before = await read();

    const ctx = await activeContract([100, 200]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);
    const after = await read();

    // One milestone of 100 paid out at a 10% fee: 200 stays in escrow, 10 becomes platform fee.
    expect(after.kinds.escrow - before.kinds.escrow).toBe(200);
    expect(after.kinds.platform_fees - before.kinds.platform_fees).toBe(10);
    expect(Number(after.f.fees.total) - Number(before.f.fees.total)).toBe(10);

    // Double entry: the books balance and nothing has drifted from its entries.
    expect(Number(after.f.reconciliation.sum_of_balances)).toBe(0);
    expect(after.f.reconciliation.drifted_accounts).toEqual([]);
    expect(Number(after.f.reconciliation.entries)).toBeGreaterThan(0);
  });

  it('spots an account whose balance no longer matches its entries', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Drifting Member');
    await buyCoins(member, 500);
    // Only a bug (or a hand-written update) could do this. The console should surface it.
    await root(`update public.coin_accounts set balance = balance + 7 where user_id = $1 and kind = 'wallet'`, [member]);

    const finance = await as(admin).rpc<{ reconciliation: { drifted_accounts: Row[]; sum_of_balances: number } }>('admin_finance');
    const drifted = finance.reconciliation.drifted_accounts;
    expect(drifted.map((d) => d.user_id)).toContain(member);
    expect(Number(finance.reconciliation.sum_of_balances)).not.toBe(0);

    await root(`update public.coin_accounts set balance = balance - 7 where user_id = $1 and kind = 'wallet'`, [member]);
  });

  it('counts purchases and withdrawals in coins and in rupees', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Paying Member');
    await buyCoins(member, 1000);
    const finance = await as(admin).rpc<Record<string, Record<string, number>>>('admin_finance');
    expect(Number(finance.purchases.paid_coins)).toBeGreaterThanOrEqual(1000);
    expect(Number(finance.purchases.paid_paise)).toBeGreaterThanOrEqual(100000);
    expect(Number(finance.issued)).toBeGreaterThanOrEqual(1000);
    expect(await balances(member)).toMatchObject({ wallet: 1000 });
  });

  it('reads the platform-wide ledger and narrows it to one member', async () => {
    const admin = await makeAdmin();
    const ctx = await activeContract([100, 200]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);

    const all = await rows(admin, 'select * from public.admin_coin_ledger()');
    expect(all.length).toBeGreaterThan(0);
    expect(Number(all[0].total_count)).toBeGreaterThan(0);

    const mine = await rows(admin, `select * from public.admin_coin_ledger('all', $1)`, [ctx.freelancer]);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.account_user === ctx.freelancer)).toBe(true);

    const releases = await rows(admin, `select * from public.admin_coin_ledger('release')`);
    expect(releases.every((r) => r.kind === 'release')).toBe(true);
    expect(releases.length).toBeGreaterThan(0);
    // The page size is clamped.
    expect((await rows(admin, `select * from public.admin_coin_ledger('all', null, 9999, 0)`)).length).toBeLessThanOrEqual(200);
  });
});

describe('the audit log', () => {
  it('is append only, even for the database owner', async () => {
    const admin = await makeAdmin();
    await as(admin).rpc('admin_record_entry', { p_detail: { ip: '203.0.113.4' } });
    const [entry] = await rows(admin, `select id, action, detail from public.admin_audit_list('console.unsealed', null, 1, 0)`);
    expect(entry.detail).toMatchObject({ ip: '203.0.113.4' });
    await expectError(root('update public.admin_audit_log set action = $1 where id = $2', ['tampered', entry.id]), 'immutable');
    await expectError(root('delete from public.admin_audit_log where id = $1', [entry.id]), 'immutable');
  });

  it('filters by action and by subject, and pages', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Audited Again');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'For the audit filter test.' });
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: false, p_reason: null });

    const suspensions = await rows(admin, `select * from public.admin_audit_list('member.suspended')`);
    expect(suspensions.every((r) => r.action === 'member.suspended')).toBe(true);
    const members = await rows(admin, `select * from public.admin_audit_list(null, 'member')`);
    expect(members.every((r) => r.subject_type === 'member')).toBe(true);
    expect(members[0].actor_name).toBe('Platform Admin');

    const page = await rows(admin, `select * from public.admin_audit_list(null, null, 1, 0)`);
    expect(page).toHaveLength(1);
    expect(Number(page[0].total_count)).toBeGreaterThan(1);
  });

  it('is part of a member’s own detail page', async () => {
    const admin = await makeAdmin();
    const member = await createUser('Tracked Member');
    await as(admin).rpc('admin_set_member_suspended', { p_user: member, p_suspend: true, p_reason: 'Shown on their own page.' });
    const detail = await as(admin).rpc<{ audit: Row[] }>('admin_member_detail', { p_user: member });
    expect(detail.audit.map((a) => a.action)).toContain('member.suspended');
    expect(detail.audit[0].actor).toBe('Platform Admin');
  });
});

describe('the service role is not an admin', () => {
  it('cannot call the console functions, because they need a signed-in admin', async () => {
    await expectError(service().query('select * from public.admin_overview()'), 'not_authenticated');
  });
});
