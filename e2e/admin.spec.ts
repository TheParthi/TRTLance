import { expect, test, type Page } from '@playwright/test';

/**
 * The platform console.
 *
 * Two groups of tests. The guard tests need only a configured environment — no accounts — because
 * what they check is that the console gives nothing away to someone who should not be there. The
 * console tests need a real admin account, and a non-admin member to prove the 404:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD   (a confirmed account in platform_admins)
 *   E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD (a confirmed account that is not an admin)
 *
 * The admin's password is used as the step-up check, so it has to be the real one.
 */
const env = (key: string) => process.env[key] ?? '';
const hasAdmin = ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'].every(env);
const hasMember = ['E2E_MEMBER_EMAIL', 'E2E_MEMBER_PASSWORD'].every(env);

/** Every console path, so a new section cannot be added without a test that it renders. */
const SECTIONS = [
  { path: '/admin', heading: 'Overview' },
  { path: '/admin/queues', heading: 'Queues' },
  { path: '/admin/members', heading: 'Members' },
  { path: '/admin/projects', heading: 'Projects' },
  { path: '/admin/contracts', heading: 'Contracts' },
  { path: '/admin/disputes', heading: 'Disputes' },
  { path: '/admin/money', heading: 'Money' },
  { path: '/admin/arbitrators', heading: 'Arbitrators' },
  { path: '/admin/settings', heading: 'Settings' },
  { path: '/admin/audit', heading: 'Audit trail' },
];

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

async function unseal(page: Page, next = '/admin') {
  await page.goto(next);
  await page.waitForURL(/\/admin\/gate/);
  await page.getByLabel('Confirm your password').fill(env('E2E_ADMIN_PASSWORD'));
  await page.getByRole('button', { name: 'Unseal the console' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/admin/gate'), { timeout: 20_000 });
}

test.describe('console guards', () => {
  test('a visitor is sent to sign in and keeps the destination', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('the gate itself is not reachable without a session', async ({ page }) => {
    await page.goto('/admin/gate');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fgate/);
  });

  test('every console section requires a session', async ({ page }) => {
    for (const section of SECTIONS.filter((s) => s.path !== '/admin')) {
      await page.goto(section.path);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
  });

  test('the console is never advertised to a visitor', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('a[href^="/admin"]').count();
    expect(links).toBe(0);
  });
});

test.describe('the console on its own origin', () => {
  const adminOrigin = env('NEXT_PUBLIC_ADMIN_URL');
  const siteOrigin = env('NEXT_PUBLIC_SITE_URL');
  const split = Boolean(adminOrigin && siteOrigin && adminOrigin !== siteOrigin);
  test.skip(!split, 'Set NEXT_PUBLIC_ADMIN_URL to a second origin to run these.');

  // These check which origin serves what. Where a path then lands depends on whether there is a
  // session — an unauthenticated visitor ends up at /login?next=… — so they assert the origin, and
  // that the console's address never settles on the marketing home.
  test('the public origin sends the console across', async ({ page }) => {
    await page.goto(`${siteOrigin}/admin/money`);
    expect(new URL(page.url()).origin).toBe(new URL(adminOrigin).origin);
  });

  test('the console origin sends the rest of the site back', async ({ page }) => {
    for (const path of ['/work', '/dashboard']) {
      await page.goto(`${adminOrigin}${path}`);
      expect(new URL(page.url()).origin, `${path} belongs on the public site`).toBe(new URL(siteOrigin).origin);
    }
  });

  test('the console origin has no marketing page to land on', async ({ page }) => {
    await page.goto(adminOrigin);
    const url = new URL(page.url());
    expect(url.origin).toBe(new URL(adminOrigin).origin);
    expect(url.pathname, 'the console origin should not serve the landing page').not.toBe('/');
  });
});

test.describe('a member who is not an admin', () => {
  test.skip(!hasMember, 'Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD to run this.');

  // Signing in happens on the public site: the console's origin serves only the console, and an
  // ordinary member has no business there — which is the whole point of these two tests.
  const site = env('NEXT_PUBLIC_SITE_URL') || 'http://localhost:9002';
  const console_ = env('NEXT_PUBLIC_ADMIN_URL') || site;

  async function signInOnSite(page: Page) {
    await page.goto(`${site}/login`);
    await page.getByLabel('Email').fill(env('E2E_MEMBER_EMAIL'));
    await page.getByLabel('Password').fill(env('E2E_MEMBER_PASSWORD'));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/);
  }

  test('sees a 404, not a refusal — the console gives nothing away', async ({ page }) => {
    await signInOnSite(page);

    for (const path of ['/admin', '/admin/gate', '/admin/money', '/admin/settings']) {
      const response = await page.goto(`${console_}${path}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${path} should be a 404`).toBe(404);
      // Nothing about the console, the queues or who the admins are.
      const text = (await page.locator('body').innerText()).toLowerCase();
      for (const leak of ['platform console', 'audit trail', 'unseal', 'suspend']) {
        expect(text, `${path} should not mention “${leak}”`).not.toContain(leak);
      }
    }
  });

  test('has no console link in their account menu', async ({ page }) => {
    await signInOnSite(page);
    await page.goto(`${site}/dashboard`);
    await page.getByRole('button', { name: 'Account menu' }).click();
    // The menu is open — the settings link proves it — and the console is not in it.
    await expect(page.getByRole('menuitem', { name: /Settings/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Platform console/ })).toHaveCount(0);
  });
});

test.describe('the console', () => {
  test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the console tests.');
  test.describe.configure({ mode: 'serial' });

  /**
   * One browser context for the whole block, unsealed once.
   *
   * Not only for speed: unsealing is rate limited to five attempts in fifteen minutes per admin, on
   * purpose, so a suite that unsealed in every test would trip its own defence and fail for the
   * wrong reason. Sharing the context also matches how the console is really used — an admin
   * unseals once and then works.
   */
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await signIn(page, env('E2E_ADMIN_EMAIL'), env('E2E_ADMIN_PASSWORD'));
    await unseal(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('every section renders', async () => {
    for (const section of SECTIONS) {
      await page.goto(section.path);
      await expect(page.getByRole('heading', { level: 1, name: section.heading }), `${section.path} should render`).toBeVisible();
      // No console screen should fall back to its error boundary.
      await expect(page.getByText('This console screen could not be loaded')).toHaveCount(0);
    }
  });

  test('the seal countdown is on screen, so nobody is surprised when it lapses', async () => {
    await page.goto('/admin');
    await expect(page.getByText(/Console session:/)).toBeVisible();
  });

  test('the navigation marks where you are', async () => {
    await page.goto('/admin');
    const nav = page.getByRole('navigation', { name: 'Console' }).filter({ visible: true }).first();
    await nav.getByRole('link', { name: /^Members/ }).click();
    await expect(page).toHaveURL(/\/admin\/members/);
    await expect(nav.getByRole('link', { name: /^Members/ })).toHaveAttribute('aria-current', 'page');
  });

  test('the money screen says whether the books balance', async () => {
    await page.goto('/admin/money');
    // Either statement is a pass; what matters is that the console commits to one.
    await expect(page.getByText(/The books balance|The ledger does not balance/)).toBeVisible();
  });

  test('members are listed, and a filter survives a reload', async () => {
    await page.goto('/admin/members');
    // Every member of the platform is an account this console can open.
    await expect(page.getByRole('table')).toBeVisible();

    const search = page.getByRole('searchbox').first();
    await search.fill('zzz-nobody-matches-this');
    await search.press('Enter');
    await page.waitForURL(/[?&]q=/);
    await expect(page.getByText(/Nobody matches/)).toBeVisible();

    await page.reload();
    await expect(search).toHaveValue('zzz-nobody-matches-this');
  });

  test('a member opens from the list', async () => {
    await page.goto('/admin/members');
    await page.getByRole('table').getByRole('link').first().click();
    await page.waitForURL(/\/admin\/members\/[0-9a-f-]{36}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The panels a support question gets answered from.
    await expect(page.getByRole('heading', { name: 'Coins', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
  });

  test('an id that goes nowhere shows the not-found page, not a crash', async () => {
    /*
     * Checked by what the person sees rather than by the status code.
     *
     * The console's layout renders before the page does, so by the time a page calls notFound() the
     * response has begun streaming and its status is already 200 — Next cannot take that back. In a
     * console that is never indexed the status matters to nobody; being shown a clear "does not
     * exist" page instead of a stack trace matters a great deal, and that is what this asserts.
     */
    for (const path of ['/admin/members/not-a-uuid', '/admin/contracts/not-a-uuid',
      '/admin/members/00000000-0000-0000-0000-000000000000',
      '/admin/contracts/00000000-0000-0000-0000-000000000000']) {
      await page.goto(path);
      await expect(page.getByText('This page does not exist'), `${path} should say so`).toBeVisible();
      await expect(page.getByText('This console screen could not be loaded')).toHaveCount(0);
    }
  });

  test('the palette jumps to a section by keyboard', async () => {
    await page.goto('/admin');
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').fill('audit');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
  });

  test('unsealing was recorded in the audit trail', async () => {
    await page.goto('/admin/audit?action=console.unsealed');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
    // Scoped to the table: the same words are also an <option> in the filter above it. Only the
    // action is asserted — the column naming the admin is hidden on a narrow screen by design.
    await expect(page.getByRole('table').getByText('Console unsealed').first()).toBeVisible();
  });

  test('the console has no horizontal overflow', async () => {
    for (const section of SECTIONS) {
      await page.goto(section.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${section.path} should not scroll sideways`).toBeLessThanOrEqual(0);
    }
  });

  // Last, because it clears the seal this block shares.
  test('leaving the console reseals it without signing out', async () => {
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Leave the console' }).click();
    await page.waitForURL(/\/dashboard/);
    // Still signed in to TrustLance…
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // …but the console asks again.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/gate/);
  });
});

test.describe('the gate', () => {
  test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the gate tests.');
  test.describe.configure({ mode: 'serial' });

  test('an admin lands at the gate, not in the console', async ({ page }) => {
    await signIn(page, env('E2E_ADMIN_EMAIL'), env('E2E_ADMIN_PASSWORD'));
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/gate\?next=%2Fadmin/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sealed' })).toBeVisible();
    // It greets them by name, so they can tell which account they are about to act as.
    await expect(page.getByText(/Signed in as/)).toBeVisible();
    await expect(page.getByLabel('Confirm your password')).toBeVisible();
  });

  test('the gate is not indexed', async ({ page }) => {
    await signIn(page, env('E2E_ADMIN_EMAIL'), env('E2E_ADMIN_PASSWORD'));
    await page.goto('/admin/gate');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('a wrong password does not unseal it', async ({ page }) => {
    await signIn(page, env('E2E_ADMIN_EMAIL'), env('E2E_ADMIN_PASSWORD'));
    await page.goto('/admin/gate');
    await page.getByLabel('Confirm your password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Unseal the console' }).click();

    // Whatever it says, it must say something and must not still be working.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/admin\/gate/);

    // Still sealed: the console is not reachable.
    await page.goto('/admin/money');
    await expect(page).toHaveURL(/\/admin\/gate/);
  });
});
