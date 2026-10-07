import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  activeContract, as, balances, buyCoins, createUser, deliverAndApprove, escrowBalance, expectError, makeAdmin, pool,
  releaseMilestone, root, service, verifiedBankAccount,
} from './helpers';

afterAll(() => pool.end());

/** Moves a freelancer's holds to "due today" so they can be withdrawn. */
async function expireHolds(uid: string) {
  await root(`update public.coin_holds set available_on = current_date where user_id = $1`, [uid]);
}

describe('buying coins', () => {
  it('credits the wallet once per payment and rejects mismatched amounts', async () => {
    const uid = await createUser('Coin Buyer');
    const purchase = await service().rpc<{ id: string; amount_paise: number }>('create_coin_purchase', { p_user: uid, p_coins: 1000, p_provider: 'mock' });
    expect(purchase.amount_paise).toBe(100000);
    await service().rpc('attach_coin_purchase_order', { p_purchase_id: purchase.id, p_order_id: 'order_test_1' });
    expect(await service().rpc('complete_coin_purchase', { p_order_id: 'order_test_1', p_payment_id: 'pay_1', p_amount_paise: 100000 })).toBe('paid');
    // The webhook and the browser callback both report it: no double credit.
    expect(await service().rpc('complete_coin_purchase', { p_order_id: 'order_test_1', p_payment_id: 'pay_1', p_amount_paise: 100000 })).toBe('paid');
    expect((await balances(uid)).wallet).toBe(1000);

    const bad = await service().rpc<{ id: string }>('create_coin_purchase', { p_user: uid, p_coins: 500, p_provider: 'mock' });
    await service().rpc('attach_coin_purchase_order', { p_purchase_id: bad.id, p_order_id: 'order_test_2' });
    expect(await service().rpc('complete_coin_purchase', { p_order_id: 'order_test_2', p_payment_id: 'pay_2', p_amount_paise: 100 })).toBe('failed');
    expect((await balances(uid)).wallet).toBe(1000);

    await expectError(service().rpc('create_coin_purchase', { p_user: uid, p_coins: 10, p_provider: 'mock' }), 'validation');
  });

  it('cannot be created or completed by users', async () => {
    const uid = await createUser('Coin Forger');
    await expectError(as(uid).rpc('create_coin_purchase', { p_user: uid, p_coins: 1000, p_provider: 'mock' }),
      'permission denied for function create_coin_purchase');
    await expectError(as(uid).rpc('complete_coin_purchase', { p_order_id: 'x', p_payment_id: 'y', p_amount_paise: 1 }),
      'permission denied for function complete_coin_purchase');
    await expectError(as(uid).rpc('run_coin_jobs'), 'permission denied for function run_coin_jobs');
  });
});

describe('posting a project', () => {
  it('needs enough coins for the budget, in whole coins', async () => {
    const client = await createUser('Poster');
    const [draft] = await as(client).query<{ id: string }>(
      `insert into public.projects (client_id, title, description, category, skills, budget_amount, experience_level, milestone_plan)
       values ($1, 'Build a booking website', 'A booking website with payments, calendar sync and an admin panel.',
               'web-development', '{react}', 1000, 'intermediate', $2) returning id`,
      [client, JSON.stringify([{ title: 'Design', amount: 400 }, { title: 'Build', amount: 600 }])]);
    const error = await expectError(as(client).rpc('publish_project', { p_project_id: draft.id }), 'insufficient_coins');
    expect(error.detail).toContain('1000 more coins');
    await buyCoins(client, 1000);
    await as(client).rpc('publish_project', { p_project_id: draft.id });
    // Posting does not lock the coins; funding the contract does.
    expect((await balances(client)).wallet).toBe(1000);
  });
});

describe('milestone payments', () => {
  it('pays the custom milestone amounts minus the fee, held for 7 working days', async () => {
    const ctx = await activeContract([1500, 3000, 3500, 2000]);
    expect(await escrowBalance(ctx.contractId)).toBe(10000);

    const result = await releaseMilestone(ctx.client, ctx.milestones[0].id);
    expect(result).toMatchObject({ freelancer_amount: 1500, fee: 150, net: 1350 });
    const [{ expected }] = await root<{ expected: string }>(`select app.add_working_days(current_date, 7)::text as expected`);
    expect(result.available_on).toBe(expected);
    expect(await balances(ctx.freelancer)).toEqual({ wallet: 0, pending: 1350, earnings: 0 });
    expect(await escrowBalance(ctx.contractId)).toBe(8500);

    // Not withdrawable yet.
    await verifiedBankAccount(ctx.freelancer);
    await expectError(as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 1000 }), 'insufficient_coins');

    // Once the hold date arrives, reading the wallet makes the coins withdrawable.
    await expireHolds(ctx.freelancer);
    const wallet = await as(ctx.freelancer).rpc<{ earnings: number; pending: number; holds: unknown[] }>('my_wallet');
    expect(wallet).toMatchObject({ earnings: 1350, pending: 0, holds: [] });
  });

  it('counts working days, skipping weekends and holidays', async () => {
    // Friday 2026-10-02 + 7 working days = Tuesday 2026-10-13; with a holiday on the Monday, Wednesday.
    const [a] = await root<{ d: string }>(`select app.add_working_days('2026-10-02', 7)::text as d`);
    expect(a.d).toBe('2026-10-13');
    await root(`insert into public.holidays (day, label) values ('2026-10-12', 'Test holiday') on conflict do nothing`);
    const [b] = await root<{ d: string }>(`select app.add_working_days('2026-10-02', 7)::text as d`);
    expect(b.d).toBe('2026-10-14');
    await root(`delete from public.holidays where day = '2026-10-12'`);
  });

  it('releases a submitted milestone automatically when the client does not respond', async () => {
    const ctx = await activeContract([100, 200]);
    await as(ctx.freelancer).rpc('submit_milestone', { p_milestone_id: ctx.milestones[0].id, p_note: 'Delivered the first part.', p_links: [], p_files: null });
    await service().rpc('run_coin_jobs');
    expect((await balances(ctx.freelancer)).pending).toBe(0);

    await root(`update public.milestones set submitted_at = now() - interval '8 days' where id = $1`, [ctx.milestones[0].id]);
    const jobs = await service().rpc<{ auto_released: number }>('run_coin_jobs');
    expect(jobs.auto_released).toBeGreaterThanOrEqual(1);
    const [m] = await root<{ status: string }>('select status from public.milestones where id = $1', [ctx.milestones[0].id]);
    expect(m.status).toBe('paid');
    expect((await balances(ctx.freelancer)).pending).toBe(90);
    const events = await root<{ type: string }>('select type from public.contract_events where contract_id = $1', [ctx.contractId]);
    expect(events.map((e) => e.type)).toContain('milestone.auto_released');
  });
});

describe('withdrawals', () => {
  it('requires a verified bank account and pays out through the admin queue', async () => {
    const ctx = await activeContract([1000]);
    await deliverAndApprove(ctx, ctx.milestones[0].id);
    await expireHolds(ctx.freelancer);

    await expectError(as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 500 }), 'payout_account_required');
    await expectError(as(ctx.freelancer).rpc('save_payout_account', {
      p_holder: 'Free Lancer', p_account_number: '12', p_ifsc: 'HDFC0001234', p_pan: 'ABCDE1234F',
    }), 'validation');
    await as(ctx.freelancer).rpc('save_payout_account', {
      p_holder: 'Free Lancer', p_account_number: '1234 5678 9012', p_ifsc: 'hdfc0001234', p_pan: 'abcde1234f',
    });
    await expectError(as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 500 }), 'payout_account_required');
    await expectError(as(ctx.freelancer).rpc('admin_review_payout_account', { p_user: ctx.freelancer, p_approve: true, p_note: null }), 'forbidden');
    const admin = await makeAdmin('Payout Admin');
    const queue = await as(admin).query<{ account_number: string; pan: string }>('select account_number, pan from public.admin_payout_account_queue()');
    expect(queue).toContainEqual({ account_number: '123456789012', pan: 'ABCDE1234F' });
    await as(admin).rpc('admin_review_payout_account', { p_user: ctx.freelancer, p_approve: true, p_note: null });

    await expectError(as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 100 }), 'validation');
    await expectError(as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 901 }), 'insufficient_coins');
    const key = randomUUID();
    const id = await as(ctx.freelancer).rpc<string>('request_withdrawal', { p_coins: 900, p_idempotency_key: key });
    expect(await as(ctx.freelancer).rpc('request_withdrawal', { p_coins: 900, p_idempotency_key: key })).toBe(id);
    expect((await balances(ctx.freelancer)).earnings).toBe(0);

    // Bank details cannot change while a withdrawal is open.
    await expectError(as(ctx.freelancer).rpc('save_payout_account', {
      p_holder: 'Someone Else', p_account_number: '999999999999', p_ifsc: 'ICIC0000001', p_pan: 'ABCDE1234F',
    }), 'invalid_state');

    const stranger = await createUser('Queue Stranger');
    await expectError(as(stranger).query('select * from public.admin_withdrawal_queue()'), 'forbidden');
    const pending = await as(admin).query<{ id: string; coins: string; account_number: string }>('select id, coins, account_number from public.admin_withdrawal_queue()');
    expect(pending).toContainEqual({ id, coins: '900', account_number: '123456789012' });

    await expectError(as(admin).rpc('admin_complete_withdrawal', { p_withdrawal_id: id, p_reference: '' }), 'validation');
    await as(admin).rpc('admin_complete_withdrawal', { p_withdrawal_id: id, p_reference: 'UTR123456789' });
    await expectError(as(admin).rpc('admin_complete_withdrawal', { p_withdrawal_id: id, p_reference: 'UTR123456789' }), 'invalid_state');
    const [w] = await as(ctx.freelancer).query<{ status: string; amount_paise: string }>('select status, amount_paise from public.withdrawals where id = $1', [id]);
    expect(w).toEqual({ status: 'paid', amount_paise: '90000' });
  });

  it('returns the coins when a withdrawal is cancelled or rejected', async () => {
    const ctx = await activeContract([1000]);
    await releaseMilestone(ctx.client, ctx.milestones[0].id);
    await expireHolds(ctx.freelancer);
    const admin = await verifiedBankAccount(ctx.freelancer);

    const first = await as(ctx.freelancer).rpc<string>('request_withdrawal', { p_coins: 600 });
    await as(ctx.freelancer).rpc('cancel_withdrawal', { p_withdrawal_id: first });
    expect((await balances(ctx.freelancer)).earnings).toBe(900);

    const second = await as(ctx.freelancer).rpc<string>('request_withdrawal', { p_coins: 600 });
    await as(admin).rpc('admin_fail_withdrawal', { p_withdrawal_id: second, p_reason: 'The bank rejected the transfer.' });
    expect((await balances(ctx.freelancer)).earnings).toBe(900);
    await expectError(as(ctx.freelancer).rpc('cancel_withdrawal', { p_withdrawal_id: second }), 'invalid_state');
  });
});

describe('the ledger', () => {
  it('always balances, cannot be edited and is private', async () => {
    const ctx = await activeContract([300]);
    await releaseMilestone(ctx.client, ctx.milestones[0].id);

    const [sum] = await root<{ entries: string; balances: string }>(
      `select (select coalesce(sum(amount), 0) from public.coin_entries) as entries,
              (select coalesce(sum(balance), 0) from public.coin_accounts) as balances`);
    expect(sum).toEqual({ entries: '0', balances: '0' });
    const unbalanced = await root(`select transaction_id from public.coin_entries group by transaction_id having sum(amount) <> 0`);
    expect(unbalanced).toHaveLength(0);
    const drift = await root(`select a.id from public.coin_accounts a
                                left join public.coin_entries e on e.account_id = a.id
                               group by a.id having a.balance <> coalesce(sum(e.amount), 0)`);
    expect(drift).toHaveLength(0);

    await expectError(root('update public.coin_entries set amount = amount * 2'), 'immutable');
    await expectError(as(ctx.client).query('select * from public.coin_entries'), 'permission denied for table coin_entries');

    const rows = await as(ctx.freelancer).query<{ kind: string; amount: string }>('select kind, amount from public.my_coin_history()');
    expect(rows).toEqual([{ kind: 'release', amount: '270' }]);
    const stranger = await createUser('Ledger Stranger');
    expect(await as(stranger).query('select * from public.contract_coin_history($1)', [ctx.contractId])).toHaveLength(0);
    expect((await as(ctx.client).query('select * from public.contract_coin_history($1)', [ctx.contractId])).length).toBeGreaterThan(0);
  });
});
