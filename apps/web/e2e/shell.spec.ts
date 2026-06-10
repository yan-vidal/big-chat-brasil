import { expect, test } from '@playwright/test';

const conversationId = '550e8400-e29b-41d4-a716-446655440011';

test.describe('BCB Angular shell', () => {
  test('renders route navigation on the login page', async ({ page }, testInfo) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Big Chat Brasil' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acesso do cliente' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Conversas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cobrança' })).toBeVisible();
    await expect(page.locator('header')).toHaveCSS('display', 'flex');

    await page.getByRole('link', { name: 'Onboarding', exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'Onboarding' })).toBeVisible();

    await testInfo.attach('sprint-7-login-shell', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('persists language and theme preferences across reloads', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Idioma').selectOption('en-US');
    await expect(page.getByRole('heading', { name: 'Client access' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Language')).toHaveValue('en-US');
    await expect(page.getByRole('heading', { name: 'Client access' })).toBeVisible();

    await page.getByRole('button', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Light theme' })).toBeVisible();
  });

  test('redirects protected routes by session and onboarding state', async ({ page }) => {
    await page.goto('/conversations');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('bcb.session.active', 'true');
      localStorage.setItem('bcb.onboarding.completed', 'false');
    });
    await page.goto('/conversations');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.evaluate(() => {
      localStorage.setItem('bcb.session.active', 'true');
      localStorage.setItem('bcb.onboarding.completed', 'true');
    });
    await page.goto(`/conversations/${conversationId}`);
    await expect(page).toHaveURL(new RegExp(`/conversations/${conversationId}$`));
    await expect(page.getByRole('heading', { name: 'Atendimento' })).toBeVisible();
    await expect(page.getByText(conversationId)).toBeVisible();
  });
});
