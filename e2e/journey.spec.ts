import { expect, test, type Page } from '@playwright/test';

/**
 * Core client ↔ freelancer journey up to "awaiting funding". Runs only against a configured
 * environment with two confirmed test accounts; the client needs at least 1,000 coins:
 *   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD, E2E_FREELANCER_EMAIL / E2E_FREELANCER_PASSWORD
 * Funding, release, withdrawals and disputes are covered by escrow-journey.spec.ts and the database tests.
 */
const env = (k: string) => process.env[k] ?? '';
const configured = ['E2E_CLIENT_EMAIL', 'E2E_CLIENT_PASSWORD', 'E2E_FREELANCER_EMAIL', 'E2E_FREELANCER_PASSWORD'].every(env);

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

test.describe('core journey', () => {
  test.skip(!configured, 'Set E2E_* credentials to run the journey against a real environment.');
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1280, height: 900 } });

  const title = `E2E project ${Date.now()}`;
  let projectUrl = '';

  test('client posts a project', async ({ page }) => {
    await signIn(page, env('E2E_CLIENT_EMAIL'), env('E2E_CLIENT_PASSWORD'));
    await page.goto('/projects/new');
    await page.getByRole('button', { name: /Start a new project/ }).click();
    await page.getByLabel('Project title').fill(title);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Describe the work').fill('Build a responsive landing page with a contact form and analytics.');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('radio', { name: /Web development/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Skills needed').fill('react');
    await page.keyboard.press('Enter');
    await page.getByRole('radio', { name: /Intermediate/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel(/Fixed budget/).fill('1000');
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Publish project' }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
    projectUrl = page.url();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  });

  test('freelancer sends a proposal', async ({ page }) => {
    await signIn(page, env('E2E_FREELANCER_EMAIL'), env('E2E_FREELANCER_PASSWORD'));
    await page.goto(`${projectUrl}/apply`);
    await page.getByLabel('Cover letter').fill('I have shipped many landing pages with React and can deliver this within a week, with tests.');
    await page.getByLabel('Title').first().fill('Landing page');
    await page.getByRole('button', { name: 'Send proposal' }).click();
    await page.waitForURL(projectUrl);
    await expect(page.getByText('Your proposal')).toBeVisible();
  });

  test('client hires, both sign, contract awaits funding', async ({ browser }) => {
    const client = await browser.newPage();
    await signIn(client, env('E2E_CLIENT_EMAIL'), env('E2E_CLIENT_PASSWORD'));
    await client.goto(`${projectUrl}/proposals`);
    await client.getByRole('button', { name: /^Hire/ }).first().click();
    await client.getByRole('button', { name: 'Hire and create contract' }).click();
    await client.waitForURL(/\/contracts\/[0-9a-f-]{36}/);
    const contractUrl = client.url();
    await client.getByLabel('Type your full name to sign').fill('E2E Client');
    await client.getByRole('checkbox').check();
    await client.getByRole('button', { name: 'Sign contract' }).click();
    await expect(client.getByText(/Signed by E2E Client/)).toBeVisible();

    const freelancer = await browser.newPage();
    await signIn(freelancer, env('E2E_FREELANCER_EMAIL'), env('E2E_FREELANCER_PASSWORD'));
    await freelancer.goto(contractUrl);
    await freelancer.getByLabel('Type your full name to sign').fill('E2E Freelancer');
    await freelancer.getByRole('checkbox').check();
    await freelancer.getByRole('button', { name: 'Sign contract' }).click();
    await expect(freelancer.getByText('Waiting for the client to fund escrow')).toBeVisible();
  });
});
