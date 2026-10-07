import { randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';

const connectionString = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/trustlance_test';
export const pool = new pg.Pool({ connectionString, max: 10 });

type Role = 'anon' | 'authenticated' | 'service_role';

export class DbError extends Error {
  constructor(public code: string, public detail: string | undefined, public pgCode: string | undefined) {
    super(code);
  }
}

function wrap(error: unknown): never {
  const e = error as { message?: string; detail?: string; code?: string };
  const message = e.message ?? String(error);
  throw new DbError(message.startsWith('TL:') ? message.slice(3) : message, e.detail, e.code);
}

/** Runs SQL inside a transaction as the given API role and user, like PostgREST does. */
async function run<T = Record<string, unknown>>(role: Role, uid: string | null, sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    const claims = JSON.stringify(uid ? { sub: uid, role } : { role });
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
    const result = await client.query(sql, params);
    await client.query('commit');
    return result.rows as T[];
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    wrap(error);
  } finally {
    client.release();
  }
}

function rpcSql(name: string, args: Record<string, unknown>) {
  const keys = Object.keys(args);
  const list = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
  return { sql: `select public.${name}(${list}) as result`, params: keys.map((k) => args[k]) };
}

export function as(uid: string | null, role: Role = uid ? 'authenticated' : 'anon') {
  return {
    query: <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => run<T>(role, uid, sql, params),
    rpc: async <T = unknown>(name: string, args: Record<string, unknown> = {}) => {
      const { sql, params } = rpcSql(name, args);
      const rows = await run<{ result: T }>(role, uid, sql, params);
      return rows[0]?.result as T;
    },
  };
}

export const service = () => as(null, 'service_role');
export const anon = () => as(null, 'anon');

/** Runs as the database owner (bypasses RLS) — for test setup and assertions only. */
export async function root<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    wrap(error);
  }
}

export async function createUser(name = 'Test User', opts: { confirmed?: boolean } = {}) {
  const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${randomUUID().slice(0, 8)}@example.test`;
  const [row] = await root<{ id: string }>(
    `insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ($1, $2, $3) returning id`,
    [email, opts.confirmed === false ? null : new Date(), { full_name: name }],
  );
  // Make the account old enough for programmes that require account age.
  return row.id;
}

/** Buys coins for a user the way the payment webhook does (service role). */
export async function buyCoins(uid: string, coins: number) {
  const purchase = await service().rpc<{ id: string }>('create_coin_purchase', { p_user: uid, p_coins: coins, p_provider: 'mock' });
  const orderId = `order_${randomBytes(8).toString('hex')}`;
  await service().rpc('attach_coin_purchase_order', { p_purchase_id: purchase.id, p_order_id: orderId });
  await service().rpc('complete_coin_purchase', { p_order_id: orderId, p_payment_id: `pay_${randomBytes(8).toString('hex')}`, p_amount_paise: coins * 100 });
  return orderId;
}

export async function balances(uid: string) {
  const rows = await root<{ kind: string; balance: string }>('select kind, balance from public.coin_accounts where user_id = $1', [uid]);
  const get = (k: string) => Number(rows.find((r) => r.kind === k)?.balance ?? 0);
  return { wallet: get('wallet'), pending: get('pending'), earnings: get('earnings') };
}

export async function escrowBalance(contractId: string) {
  const [row] = await root<{ balance: string }>('select balance from public.coin_accounts where contract_id = $1', [contractId]);
  return Number(row?.balance ?? 0);
}

export const milestonePlan = (amounts: number[], dueEvery = 5) =>
  amounts.map((amount, i) => ({
    title: `Milestone ${i + 1}`,
    description: `Deliverable ${i + 1}`,
    amount,
    due_in_days: dueEvery * (i + 1),
  }));

export async function createOpenProject(clientId: string, budget = 300, extra: Record<string, unknown> = {}) {
  await buyCoins(clientId, budget);
  const [project] = await as(clientId).query<{ id: string }>(
    `insert into public.projects (client_id, title, description, category, skills, budget_amount, experience_level)
     values ($1, $2, $3, 'web-development', '{react,typescript}', $4, 'intermediate') returning id`,
    [clientId, 'Build a marketing website', 'We need a responsive marketing site with a blog and a contact form.', budget],
  );
  if (Object.keys(extra).length) {
    const sets = Object.keys(extra).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await as(clientId).query(`update public.projects set ${sets} where id = $1`, [project.id, ...Object.values(extra)]);
  }
  await as(clientId).rpc('publish_project', { p_project_id: project.id });
  return project.id;
}

export async function submitProposal(freelancerId: string, projectId: string, amounts = [100, 200]) {
  return as(freelancerId).rpc<string>('submit_proposal', {
    p_project_id: projectId,
    p_cover_letter: 'I have built many marketing websites with React and TypeScript and can start this week.',
    p_amount: amounts.reduce((a, b) => a + b, 0),
    p_duration_days: 5 * amounts.length + 5,
    p_relevant_skills: ['react'],
    p_milestones: JSON.stringify(milestonePlan(amounts)),
  });
}

export async function fundContract(contractId: string, clientId: string) {
  return as(clientId).rpc<string>('fund_contract', { p_contract_id: contractId });
}

/** Client + freelancer with a signed contract awaiting funding (the client already holds the coins). */
export async function signedContract(amounts = [100, 200]) {
  const client = await createUser('Client Person');
  const freelancer = await createUser('Freelancer Person');
  const projectId = await createOpenProject(client, amounts.reduce((a, b) => a + b, 0));
  const proposalId = await submitProposal(freelancer, projectId, amounts);
  const contractId = await as(client).rpc<string>('accept_proposal', { p_proposal_id: proposalId });
  const [{ terms_hash }] = await root<{ terms_hash: string }>('select terms_hash from public.contracts where id = $1', [contractId]);
  await as(client).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Client Person', p_terms_hash: terms_hash });
  await as(freelancer).rpc('sign_contract', { p_contract_id: contractId, p_full_name: 'Freelancer Person', p_terms_hash: terms_hash });
  return { client, freelancer, projectId, proposalId, contractId };
}

export async function activeContract(amounts = [100, 200]) {
  const ctx = await signedContract(amounts);
  await fundContract(ctx.contractId, ctx.client);
  const milestones = await root<{ id: string; position: number; amount: string; status: string }>(
    'select id, position, amount, status from public.milestones where contract_id = $1 order by position',
    [ctx.contractId],
  );
  return { ...ctx, milestones };
}

export async function releaseMilestone(clientId: string, milestoneId: string) {
  return as(clientId).rpc<{ fee: number; net: number; available_on: string }>('release_milestone', { p_milestone_id: milestoneId });
}

/** Creates a platform admin. */
export async function makeAdmin(name = 'Platform Admin') {
  const uid = await createUser(name);
  await root('insert into public.platform_admins (user_id) values ($1)', [uid]);
  return uid;
}

/** Saves and verifies a bank account so the user can withdraw. */
export async function verifiedBankAccount(uid: string, admin?: string) {
  await as(uid).rpc('save_payout_account', {
    p_holder: 'Test Person', p_account_number: '123456789012', p_ifsc: 'HDFC0001234', p_pan: 'ABCDE1234F',
  });
  const reviewer = admin ?? (await makeAdmin('Bank Reviewer'));
  await as(reviewer).rpc('admin_review_payout_account', { p_user: uid, p_approve: true, p_note: null });
  return reviewer;
}

export async function deliverAndApprove(ctx: { contractId: string; client: string; freelancer: string }, milestoneId: string) {
  await as(ctx.freelancer).rpc('submit_milestone', {
    p_milestone_id: milestoneId,
    p_note: 'Delivered the work as agreed.',
    p_links: ['https://example.com/delivery'],
    p_files: null,
  });
  await as(ctx.client).rpc('approve_milestone', { p_milestone_id: milestoneId });
}

export async function expectError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof DbError) {
      if (error.code !== code) throw new Error(`Expected error ${code}, got ${error.code} (${error.detail ?? ''})`);
      return error;
    }
    throw error;
  }
  throw new Error(`Expected error ${code}, but the call succeeded`);
}
