import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * The whole money lifecycle through the real UI, with test payments (no real money):
 * sign up → onboarding → buy coins → post → propose → hire → sign → lock coins in escrow →
 * submit → approve and pay → 7-working-day hold → bank account → withdrawal paid by an admin →
 * dispute → arbitrator decision (settles immediately).
 *
 * Requires the local stack (scripts/local-stack, freshly set up) and the app running against it with
 * PAYMENTS_PROVIDER unset (test payments).
 * Run with: E2E_LOCAL_STACK=1 npm run test:e2e -- escrow-journey
 */
test.skip(!process.env.E2E_LOCAL_STACK, 'Set E2E_LOCAL_STACK=1 with the local stack running.');
test.setTimeout(20 * 60 * 1000);
// One run per database reset: the journey creates fixed arbitrator/admin roles.
test.skip(({ isMobile }) => isMobile, 'Runs once, on the desktop project.');

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:9002';
const DB = process.env.LOCAL_DB_NAME ?? 'trustlance_dev';
const SHOTS = 'test-results/escrow-journey';
const stamp = Date.now().toString(36);
const errors: string[] = [];
let browser: Browser;

const sql = (q: string) => execSync(`psql -d ${DB} -Atc "${q}"`).toString().trim();

async function persona(name: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${name}: HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('realtime') && !m.text().includes('WebSocket') && !m.text().startsWith('Failed to load resource') && errors.push(`${name}: ${m.text()}`));
  return { page, name };
}

const shot = async (p: Page, n: string) => { await p.waitForLoadState('load'); await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); };
const step = (s: string) => test.info().annotations.push({ type: 'step', description: s });
const next = async (p: Page, n: number) => { await p.getByRole('button', { name: 'Continue' }).click(); await p.getByText(`Step ${n} of 9`, { exact: true }).waitFor(); };
const userId = (displayName: string) => sql(`select id from profiles where display_name = '${displayName}' order by created_at desc limit 1`);
const balance = (uid: string, kind: string) => Number(sql(`select coalesce((select balance from coin_accounts where user_id = '${uid}' and kind = '${kind}'), 0)`));

async function signupAndOnboard(p: Page, fullName: string, intent: string) {
  await p.goto(`${BASE}/signup`);
  await p.getByLabel('Full name').fill(fullName);
  await p.getByLabel('Email').fill(`${fullName.split(' ')[0].toLowerCase()}.${stamp}@example.test`);
  await p.getByLabel('Password').fill('correct horse 42 battery');
  await p.getByRole('button', { name: 'Create account' }).click();
  await p.waitForURL(/onboarding/);
  await p.getByRole('button', { name: 'Get started' }).click();
  await p.getByRole('radio', { name: intent }).click();
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByLabel('Headline').fill(intent === 'Hire talent' ? 'Founder at a small studio' : 'Full-stack developer, React and Node');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByLabel('Skills').fill('react');
  await p.keyboard.press('Enter');
  await p.getByLabel('Skills').fill('typescript');
  await p.keyboard.press('Enter');
  if (intent !== 'Hire talent') await p.getByLabel('Experience level').selectOption('expert');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('button', { name: 'Skip' }).click(); // photo (storage not in local stack)
  await p.getByRole('button', { name: 'Skip' }).click(); // professional
  await shot(p, `onboarding-trust-${fullName.split(' ')[0].toLowerCase()}`);
  await p.getByRole('button', { name: 'Skip' }).click(); // trust & payments
  await p.getByRole('button', { name: /Post a project|Find work|Go to dashboard/ }).click();
  await p.waitForURL(/projects\/new|work|dashboard/);
}

test('coin escrow lifecycle with withdrawal and dispute', async ({ browser: b }) => {
  browser = b;
  mkdirSync(SHOTS, { recursive: true });
  const client = await persona('client');
  const free = await persona('freelancer');

  step('sign up + onboarding');
  await signupAndOnboard(client.page, 'Asha Client', 'Hire talent');
  await signupAndOnboard(free.page, 'Ravi Freelancer', 'Find work');
  const clientId = userId('Asha Client');
  const freeId = userId('Ravi Freelancer');

  step('client buys coins (test payment)');
  const c = client.page;
  await c.goto(`${BASE}/wallet`);
  await shot(c, 'wallet-empty');
  await c.getByLabel('Or enter an amount').fill('3000');
  await c.getByRole('button', { name: 'Buy coins' }).click();
  await c.getByRole('button', { name: 'Confirm test payment' }).click();
  await c.getByText('3,000 coins added to your wallet.').waitFor();
  expect(balance(clientId, 'wallet')).toBe(3000);

  step('post project with custom milestones');
  await c.goto(`${BASE}/projects/new`);
  await c.getByRole('button', { name: /Start a new project/ }).click();
  await c.waitForURL(/edit/);
  await c.getByLabel('Project title').fill('Marketing site for a design studio');
  await next(c, 2);
  await c.getByLabel('Describe the work').fill('We need a fast, accessible marketing site with a portfolio grid, a contact form and a simple CMS for case studies.');
  await next(c, 3);
  await c.getByRole('radio', { name: /Web development/ }).click();
  await next(c, 4);
  await c.getByLabel('Skills needed').fill('react');
  await c.keyboard.press('Enter');
  await c.getByRole('radio', { name: /Intermediate/ }).click();
  await next(c, 5);
  await c.getByLabel(/Fixed budget/).fill('3000');
  await next(c, 6);
  await next(c, 7); // timeline
  await c.getByLabel('Deliverable 1', { exact: true }).fill('Responsive site deployed to production');
  await c.getByRole('button', { name: 'Add milestone' }).click();
  await c.getByLabel('Title', { exact: true }).nth(0).fill('Design and build');
  await c.getByLabel('Amount', { exact: true }).nth(0).fill('2000');
  await c.getByRole('button', { name: 'Add milestone' }).click();
  await c.getByLabel('Title', { exact: true }).nth(1).fill('Launch and handover');
  await c.getByLabel('Amount', { exact: true }).nth(1).fill('1000');
  await shot(c, 'wizard-milestones');
  await next(c, 8);
  await next(c, 9); // visibility
  await shot(c, 'wizard-review');
  await c.getByRole('button', { name: 'Publish project' }).click();
  await c.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = c.url();

  step('freelancer applies');
  const f = free.page;
  await f.goto(projectUrl);
  await f.getByRole('link', { name: /Submit a proposal/ }).click();
  await f.getByLabel('Cover letter').fill('I have built a dozen studio sites with React and a headless CMS. I will start with a design pass, then build and launch.');
  await shot(f, 'proposal-composer');
  await f.getByRole('button', { name: 'Send proposal' }).click();
  await f.waitForURL(projectUrl);

  step('client hires; both sign');
  await c.goto(`${projectUrl}/proposals`);
  await c.getByRole('button', { name: /^Hire/ }).first().click();
  await c.getByRole('button', { name: 'Hire and create contract' }).click();
  await c.waitForURL(/\/contracts\/[0-9a-f-]{36}/);
  const contractUrl = c.url();
  const contractId = contractUrl.split('/').pop()!.split('?')[0];
  await c.getByLabel('Type your full name to sign').fill('Asha Client');
  await c.getByRole('checkbox').check();
  await c.getByRole('button', { name: 'Sign contract' }).click();
  await c.getByText(/Signed by Asha Client/).waitFor();
  await f.goto(contractUrl);
  await f.getByLabel('Type your full name to sign').fill('Ravi Freelancer');
  await f.getByRole('checkbox').check();
  await f.getByRole('button', { name: 'Sign contract' }).click();
  await f.getByText('Waiting for the client to fund escrow').first().waitFor();

  step('client locks the coins');
  await c.goto(contractUrl);
  await c.getByRole('button', { name: 'Fund escrow' }).first().click();
  await shot(c, 'fund-dialog');
  await c.getByRole('button', { name: 'Lock coins' }).click();
  await c.getByText('Escrow funded. The freelancer has been told to start.').waitFor();
  expect(balance(clientId, 'wallet')).toBe(0);
  expect(Number(sql(`select balance from coin_accounts where contract_id = '${contractId}'`))).toBe(3000);
  await shot(c, 'contract-active-client');

  step('freelancer delivers milestone 1; client approves and pays');
  await f.reload();
  await f.getByRole('button', { name: 'Submit work' }).first().click();
  await f.getByLabel('Delivery note').fill('Design and build complete. Staging link below.');
  await f.getByLabel('Link 1').fill('https://staging.example.com');
  await f.getByRole('button', { name: 'Submit for review' }).click();
  await f.getByText('Submission v1').waitFor();
  await c.reload();
  await c.getByRole('button', { name: 'Approve & release' }).click();
  await shot(c, 'approve-dialog');
  await c.getByRole('button', { name: 'Approve and pay' }).click();
  await c.getByText(/Released\. 1,800 coins goes to the freelancer/).waitFor();
  expect(balance(freeId, 'pending')).toBe(1800);
  await c.goto(`${contractUrl}?tab=funding`);
  await shot(c, 'contract-escrow-movements');

  step('hold ends; freelancer adds a bank account and withdraws');
  const admin = await persona('admin');
  await signupAndOnboard(admin.page, 'Platform Admin', 'Both');
  sql(`insert into platform_admins (user_id) values ('${userId('Platform Admin')}')`);
  sql(`update coin_holds set available_on = current_date where user_id = '${freeId}'`);
  await f.goto(`${BASE}/wallet`);
  await f.getByLabel('Account holder name').fill('Ravi Freelancer');
  await f.getByLabel('Account number').fill('123456789012');
  await f.getByLabel('IFSC').fill('HDFC0001234');
  await f.getByLabel('PAN').fill('ABCDE1234F');
  await f.getByRole('button', { name: 'Save bank account' }).click();
  await f.getByText('Being verified').waitFor();
  const ad = admin.page;
  await ad.goto(`${BASE}/admin#bank-accounts`);
  await shot(ad, 'admin-bank-accounts');
  await ad.getByRole('button', { name: 'Verify' }).first().click();
  await ad.getByRole('button', { name: 'Verify' }).last().click();
  await f.reload();
  await shot(f, 'wallet-freelancer');
  await f.getByLabel('Amount to withdraw').fill('1000');
  await f.getByRole('button', { name: 'Withdraw' }).click();
  await f.getByRole('button', { name: 'Request withdrawal' }).click();
  await f.getByText('Withdrawal requested.').first().waitFor();
  await ad.goto(`${BASE}/admin#withdrawals`);
  await ad.getByRole('button', { name: 'Mark as paid' }).first().click();
  await ad.getByLabel('Bank transfer reference (UTR)').fill('UTR0001234567');
  await ad.getByRole('button', { name: 'Mark as paid' }).last().click();
  for (let i = 0; i < 20 && sql(`select status from withdrawals where user_id = '${freeId}'`) !== 'paid'; i++) await ad.waitForTimeout(500);
  expect(sql(`select status from withdrawals where user_id = '${freeId}'`)).toBe('paid');
  expect(balance(freeId, 'earnings')).toBe(800);

  step('dispute on milestone 2; arbitrator decides 40%');
  const arb = await persona('arbitrator');
  await signupAndOnboard(arb.page, 'Meera Arbiter', 'Find work');
  sql(`insert into arbitrators (user_id, status, specializations, statement, capacity, is_available) values ('${userId('Meera Arbiter')}', 'approved', '{web-development}', 'Experienced reviewer of software delivery disputes across many teams.', 3, true)`);
  const m2 = sql(`select id from milestones where contract_id = '${contractId}' and position = 2`);
  await c.goto(`${BASE}/disputes/new?contract=${contractId}&milestone=${m2}`);
  await c.getByRole('button', { name: 'Continue' }).click();
  await c.getByRole('radio', { name: /Missed deadline/ }).click();
  await c.getByLabel('Describe the problem').fill('The launch milestone was not delivered and the freelancer stopped replying to messages for over a week.');
  await c.getByRole('button', { name: 'Continue' }).click();
  await c.getByRole('radio', { name: /Split it/ }).click();
  await c.getByLabel('Freelancer share in percent').fill('30');
  await c.getByRole('button', { name: 'Continue' }).click();
  await c.getByRole('button', { name: 'Continue' }).click(); // evidence
  await c.getByRole('checkbox').check();
  await c.getByRole('button', { name: /dispute/i }).last().click();
  await c.waitForURL(/\/disputes\/[0-9a-f-]{36}$/);
  const disputeUrl = c.url();
  await shot(c, 'dispute-party');

  const a = arb.page;
  await a.goto(disputeUrl.replace('/disputes/', '/arbitration/cases/'));
  await a.getByRole('button', { name: /start review/ }).click();
  await a.getByRole('button', { name: 'Record decision' }).click();
  await a.getByRole('radio', { name: /^Split/ }).click();
  await a.getByLabel('Freelancer share in percent').fill('40');
  await a.getByLabel('Reasoning').fill('Design work for the launch was partly done, but the handover was missed; a 40/60 split reflects the delivered portion.');
  await a.getByRole('button', { name: 'Record final decision' }).click();
  for (let i = 0; i < 30 && sql(`select settlement_status from disputes order by created_at desc limit 1`) !== 'settled'; i++) await a.waitForTimeout(500);
  await shot(a, 'case-room-decided');

  // Milestone 2 (1,000): 400 to the freelancer less the 10% fee = 360 on hold; 600 back to the client.
  expect(sql(`select status || ' / ' || settlement_status from disputes order by created_at desc limit 1`)).toBe('resolved / settled');
  expect(sql(`select status from contracts where id = '${contractId}'`)).toBe('completed');
  expect(balance(freeId, 'pending')).toBe(360);
  expect(balance(clientId, 'wallet')).toBe(600);
  expect(sql('select sum(amount) from coin_entries')).toBe('0');
  await c.goto(disputeUrl);
  await shot(c, 'dispute-settled');
  expect(errors).toEqual([]);
});
