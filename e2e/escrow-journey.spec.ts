import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { JsonRpcProvider, Wallet, getBytes, toUtf8String } from 'ethers';

/**
 * The whole money lifecycle through the real UI, on a local chain:
 * sign up → onboarding → SIWE wallet verification → post → propose → hire → sign → fund escrow →
 * submit → approve → release → dispute → on-chain flag → arbitrator decision → arbiter settlement.
 *
 * Wallets are injected (EIP-1193) and backed by Hardhat accounts, so no extension is needed.
 * Requires: `npx hardhat node` + `npm run deploy:local` (blockchain/), the local stack
 * (scripts/local-stack, freshly set up), and the app running with .env.local pointing at both.
 * Run with: E2E_LOCAL_STACK=1 npm run test:e2e -- escrow-journey
 */
test.skip(!process.env.E2E_LOCAL_STACK, 'Set E2E_LOCAL_STACK=1 with the local stack and Hardhat node running.');
test.setTimeout(10 * 60 * 1000);

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:9002';
const DB = process.env.LOCAL_DB_NAME ?? 'trustlance_dev';
const SHOTS = 'test-results/escrow-journey';
const rpc = new JsonRpcProvider(process.env.E2E_RPC_URL ?? 'http://127.0.0.1:8545', 31337, { staticNetwork: true, cacheTimeout: -1 });
const stamp = Date.now().toString(36);
const errors: string[] = [];
const pages: Page[] = [];
let browser: Browser;

const funder = new Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', rpc);
async function persona(name: string, key?: string) {
  const wallet = key ? new Wallet(key, rpc) : Wallet.createRandom().connect(rpc);
  if (!key) await (await funder.sendTransaction({ to: wallet.address, value: 100n * 10n ** 18n, nonce: await rpc.getTransactionCount(funder.address, 'pending') })).wait();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.exposeFunction('__ethRequest', async (method: string, params: unknown[] = []) => {
    switch (method) {
      case 'eth_accounts':
      case 'eth_requestAccounts': return [wallet.address];
      case 'eth_chainId': return '0x7a69';
      case 'net_version': return '31337';
      case 'personal_sign': return wallet.signMessage(toUtf8String(getBytes(params[0] as string)));
      case 'eth_sendTransaction': {
        const t = params[0] as { to: string; data: string; value?: string };
        const tx = await wallet.sendTransaction({ to: t.to, data: t.data, value: t.value ?? 0 });
        return tx.hash;
      }
      default: return rpc.send(method, params);
    }
  });
  await ctx.addInitScript(() => {
    const w = window as unknown as { __ethRequest: (m: string, p?: unknown[]) => Promise<unknown>; ethereum: unknown };
    w.ethereum = {
      isMetaMask: true,
      request: ({ method, params }: { method: string; params?: unknown[] }) => w.__ethRequest(method, params),
      on() {}, removeListener() {},
    };
  });
  const page = await ctx.newPage();
  pages.push(page);
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${name}: HTTP ${r.status()} ${r.url().replace(BASE, '')}`); });
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('realtime') && !m.text().includes('WebSocket') && !m.text().startsWith('Failed to load resource') && errors.push(`${name}: ${m.text()}`));
  return { page, wallet, name };
}

const shot = async (p: Page, n: string) => { await p.waitForLoadState('networkidle'); await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); };
const step = (s: string) => test.info().annotations.push({ type: 'step', description: s });
const next = async (p: Page, n: number) => { await p.getByRole('button', { name: 'Continue' }).click(); await p.getByText(`Step ${n} of 9`, { exact: true }).waitFor(); };

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
  await p.getByRole('button', { name: 'Skip' }).click(); // trust & wallet
  await p.getByRole('button', { name: /Post a project|Find work|Go to dashboard/ }).click();
  await p.waitForURL(/projects\/new|work|dashboard/);
}

async function verifyWallet(p: Page) {
  await p.goto(`${BASE}/wallet`);
  await p.getByRole('button', { name: 'Verify this wallet' }).click();
  await p.getByText('Verified', { exact: true }).first().waitFor({ timeout: 20000 });
}


test('escrow lifecycle with dispute settlement', async ({ browser: b }) => {
  browser = b;
  mkdirSync(SHOTS, { recursive: true });
  const client = await persona('client');
  const free = await persona('freelancer');

  step('sign up + onboarding');
  await signupAndOnboard(client.page, 'Asha Client', 'Hire talent');
  await signupAndOnboard(free.page, 'Ravi Freelancer', 'Find work');
  await shot(free.page, 'work-empty');

  step('wallet verification');
  await verifyWallet(client.page);
  await shot(client.page, 'wallet-verified');
  await verifyWallet(free.page);

  step('post project');
  const c = client.page;
  await c.goto(`${BASE}/projects/new`);
  await shot(c, 'projects-new');
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
  await c.getByLabel(/Fixed budget/).fill('30');
  await next(c, 6);
  await next(c, 7); // timeline
  await c.getByLabel('Deliverable 1', { exact: true }).fill('Responsive site deployed to production');
  await c.getByRole('button', { name: 'Add milestone' }).click();
  await c.getByLabel('Title', { exact: true }).nth(0).fill('Design and build');
  await c.getByLabel('Amount', { exact: true }).nth(0).fill('20');
  await c.getByRole('button', { name: 'Add milestone' }).click();
  await c.getByLabel('Title', { exact: true }).nth(1).fill('Launch and handover');
  await c.getByLabel('Amount', { exact: true }).nth(1).fill('10');
  await shot(c, 'wizard-milestones');
  await next(c, 8);
  await next(c, 9); // visibility
  await shot(c, 'wizard-review');
  await c.getByRole('button', { name: 'Publish project' }).click();
  await c.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = c.url();
  await shot(c, 'project-owner');

  step('freelancer applies');
  const f = free.page;
  await f.goto(`${BASE}/work`);
  await shot(f, 'work-list');
  await f.goto(projectUrl);
  await shot(f, 'project-freelancer');
  await f.getByRole('link', { name: /Submit a proposal/ }).click();
  await f.getByLabel('Cover letter').fill('I have built a dozen studio sites with React and a headless CMS. I will start with a design pass, then build and launch.');
  await shot(f, 'proposal-composer');
  await f.getByRole('button', { name: 'Send proposal' }).click();
  await f.waitForURL(projectUrl);

  step('client compares and hires');
  await c.goto(`${projectUrl}/proposals`);
  await shot(c, 'proposals');
  await c.getByRole('button', { name: /^Hire/ }).first().click();
  await shot(c, 'hire-dialog');
  await c.getByRole('button', { name: 'Hire and create contract' }).click();
  await c.waitForURL(/\/contracts\/[0-9a-f-]{36}/);
  const contractUrl = c.url();

  step('both sign');
  await c.getByLabel('Type your full name to sign').fill('Asha Client');
  await c.getByRole('checkbox').check();
  await c.getByRole('button', { name: 'Sign contract' }).click();
  await c.getByText(/Signed by Asha Client/).waitFor();
  await f.goto(contractUrl);
  await f.getByLabel('Type your full name to sign').fill('Ravi Freelancer');
  await f.getByRole('checkbox').check();
  await f.getByRole('button', { name: 'Sign contract' }).click();
  await f.getByText('Waiting for the client to fund escrow').first().waitFor();

  step('client funds escrow');
  for (let i = 0; i < 5; i++) {
    await c.goto(contractUrl);
    if (await c.getByRole('button', { name: 'Fund escrow' }).isVisible()) break;
    
    await c.waitForTimeout(1000);
  }
  await c.getByRole('button', { name: 'Fund escrow' }).click();
  await shot(c, 'fund-dialog');
  await c.getByRole('button', { name: 'Deposit in wallet' }).click();
  await c.getByText('Confirmed on-chain').waitFor({ timeout: 60000 });
  await shot(c, 'fund-confirmed');
  await c.getByRole('button', { name: 'Done' }).click();
  await c.reload();
  await shot(c, 'contract-active-client');

  step('freelancer delivers milestone 1');
  await f.reload();
  await shot(f, 'contract-active-freelancer');
  await f.getByRole('button', { name: 'Submit work' }).first().click();
  await f.getByLabel('Delivery note').fill('Design and build complete. Staging link below.');
  await f.getByLabel('Link 1').fill('https://staging.example.com');
  await f.getByRole('button', { name: 'Submit for review' }).click();
  await f.getByText('Submission v1').waitFor();

  step('client approves and releases');
  await c.reload();
  await c.getByRole('button', { name: 'Approve & release' }).click();
  await c.getByRole('button', { name: 'Approve and continue' }).click();
  await c.getByRole('button', { name: 'Release in wallet' }).click();
  await c.getByText('Confirmed on-chain').waitFor({ timeout: 60000 });
  await c.getByRole('button', { name: 'Done' }).click();
  await c.reload();
  await shot(c, 'contract-after-release');
  await c.goto(`${contractUrl}?tab=funding`);
  await shot(c, 'contract-transactions');
  await c.goto(`${contractUrl}?tab=activity`);
  await shot(c, 'contract-activity');
  await c.goto(`${BASE}/dashboard`);
  await shot(c, 'dashboard-client');
  await f.goto(`${BASE}/dashboard`);
  await shot(f, 'dashboard-freelancer');
  await f.goto(`${BASE}/wallet`);
  await shot(f, 'wallet-freelancer');

  step('dispute on milestone 2');
  const sql = (q: string) => execSync(`psql -d ${DB} -Atc "${q}"`).toString().trim();
  const arb = await persona('arbitrator');
  await signupAndOnboard(arb.page, 'Meera Arbiter', 'Find work');
  const arbId = sql("select id from profiles where display_name = 'Meera Arbiter' order by created_at desc limit 1");
  sql(`insert into arbitrators (user_id, status, specializations, statement, capacity, is_available) values ('${arbId}', 'approved', '{web-development}', 'Experienced reviewer of software delivery disputes across many teams.', 3, true)`);
  const admin = await persona('admin', '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
  await signupAndOnboard(admin.page, 'Platform Admin', 'Both');
  const adminId = sql("select id from profiles where display_name = 'Platform Admin' order by created_at desc limit 1");
  sql(`insert into platform_admins (user_id) values ('${adminId}')`);

  const contractId = contractUrl.split('/').pop();
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
  await shot(c, 'dispute-review');
  await c.getByRole('checkbox').check();
  await c.getByRole('button', { name: /dispute/i }).last().click();
  await c.waitForURL(/\/disputes\/[0-9a-f-]{36}$/);
  const disputeUrl = c.url();
  await shot(c, 'dispute-party');
  await c.getByRole('button', { name: 'Flag milestone on-chain' }).click();
  await c.getByRole('button', { name: 'Flag on-chain' }).click();
  await c.getByText('Confirmed on-chain').waitFor({ timeout: 60000 });
  await c.getByRole('button', { name: 'Done' }).click();

  step('arbitrator decides');
  const a = arb.page;
  await a.goto(`${BASE}/arbitration`);
  await shot(a, 'arbitration-home');
  await a.goto(disputeUrl.replace('/disputes/', '/arbitration/cases/'));
  await shot(a, 'case-room');
  await a.getByRole('button', { name: /start review/ }).click();
  await a.getByRole('button', { name: 'Record decision' }).waitFor();
  await a.getByRole('button', { name: 'Record decision' }).click();
  await a.getByRole('radio', { name: /^Split/ }).click();
  await a.getByLabel('Freelancer share in percent').fill('40');
  await a.getByLabel('Reasoning').fill('Design work for the launch was partly done, but the handover was missed; a 40/60 split reflects the delivered portion.');
  await a.getByRole('button', { name: 'Record final decision' }).click();
  for (let i = 0; i < 30 && sql(`select status from disputes order by created_at desc limit 1`) !== 'resolved'; i++) await a.waitForTimeout(500);
  await shot(a, 'case-room-decided');

  step('admin settles on-chain');
  const ad = admin.page;
  await ad.goto(`${BASE}/admin`);
  await shot(ad, 'admin');
  await ad.getByRole('button', { name: 'Settle on-chain' }).first().click();
  await ad.getByRole('button', { name: 'Send settlement' }).click();
  for (let i = 0; i < 30 && sql(`select settlement_status from disputes order by created_at desc limit 1`) !== 'settled'; i++) await ad.waitForTimeout(2000);
  await ad.reload();
  await shot(ad, 'admin-after');
  expect(sql(`select status || ' / ' || settlement_status from disputes order by created_at desc limit 1`)).toBe('resolved / settled');
  expect(sql(`select status from contracts where id = '${contractId}'`)).toBe('completed');
  await c.goto(disputeUrl);
  await shot(c, 'dispute-settled');
  // 100 SHM starting balance + 20 released + 40% of 10 settled, minus gas spent by the freelancer (none).
  expect(await rpc.getBalance(free.wallet.address)).toBe(124n * 10n ** 18n);
  expect(errors).toEqual([]);
});
