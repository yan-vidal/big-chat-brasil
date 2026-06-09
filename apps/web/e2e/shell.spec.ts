import { expect, test } from '@playwright/test';

test('renders the current BCB app shell on a deep route', async ({ page }, testInfo) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Big Chat Brasil' })).toBeVisible();
  await expect(page.getByText('Sprint 0')).toBeVisible();
  await expect(page.getByText('BCB route ready.')).toBeVisible();

  await expect(page.locator('header')).toHaveCSS('display', 'flex');
  await expect(page.getByRole('heading', { name: 'Big Chat Brasil' })).toHaveCSS(
    'font-size',
    '20px',
  );
  await expect(page.getByRole('heading', { name: 'Big Chat Brasil' })).toHaveCSS(
    'font-weight',
    '600',
  );

  await testInfo.attach('login-shell', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});
