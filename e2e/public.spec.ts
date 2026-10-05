import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('landing explains the product without legacy copy or fake statistics', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('funded before it starts');
    const text = await page.locator('body').innerText();
    for (const banned of ['Freelancer.com', 'largest freelance marketplace', 'Save up to 90%', '60,000,000']) {
      expect(text).not.toContain(banned);
    }
    await expect(page.getByRole('link', { name: /Create a free account/ })).toBeVisible();
  });

  test('navigation works on every viewport', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('dialog').getByRole('link', { name: 'Browse projects' }).click();
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Browse projects' }).click();
    }
    await expect(page).toHaveURL(/\/work/);
    await expect(page.getByRole('heading', { level: 1, name: 'Find work' })).toBeVisible();
  });

  test('no horizontal overflow on the landing page', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('legacy routes redirect to their replacements', async ({ page }) => {
    await page.goto('/find-jobs');
    await expect(page).toHaveURL(/\/work$/);
  });

  test('private areas require sign-in and keep the destination', async ({ page }) => {
    await page.goto('/contracts');
    await expect(page).toHaveURL(/\/login\?next=%2Fcontracts/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('sign-up form is labelled and validates passwords', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('Test Person');
    await page.getByLabel('Email').fill('person@example.test');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/at least 10 characters/i).first()).toBeVisible();
  });

  test('unknown pages show a helpful 404', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This page does not exist' })).toBeVisible();
  });
});
