import { expect, test } from '@playwright/test';

const conversationId = '550e8400-e29b-41d4-a716-446655440011';
const clientId = '550e8400-e29b-41d4-a716-446655440001';

function storeSession(onboardingCompleted: boolean): string {
  return JSON.stringify({
    token: 'test-token',
    requiresOnboarding: !onboardingCompleted,
    client: {
      id: clientId,
      name: 'Empresa ABC',
      documentId: '11222333000181',
      documentType: 'CNPJ',
      role: 'client',
      planType: 'prepaid',
      active: true,
      onboardingCompleted,
      balanceCents: 2500,
      monthlyUsedCents: 0,
    },
  });
}

test.describe('BCB Angular shell', () => {
  test('renders route navigation on the login page', async ({ page }, testInfo) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Big Chat Brasil' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Acesso do cliente' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Onboarding', exact: true })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Conversas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cobrança' })).toBeVisible();
    await expect(page.locator('header')).toHaveCSS('display', 'flex');

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
      localStorage.setItem(
        'bcb.session',
        JSON.stringify({
          token: 'test-token',
          requiresOnboarding: true,
          client: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Empresa ABC',
            documentId: '11222333000181',
            documentType: 'CNPJ',
            role: 'client',
            planType: 'prepaid',
            active: true,
            onboardingCompleted: false,
            balanceCents: 2500,
            monthlyUsedCents: 0,
          },
        }),
      );
    });
    await page.goto('/conversations');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.evaluate((session) => {
      localStorage.setItem('bcb.session', session);
    }, storeSession(true));
    await page.route(`http://localhost:3000/conversations/${conversationId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: conversationId,
          recipientId: '550e8400-e29b-41d4-a716-446655440021',
          recipientName: 'Maria Oliveira',
          lastMessageContent: null,
          lastMessageAt: null,
          unreadCount: 0,
        }),
      });
    });
    await page.route(
      `http://localhost:3000/conversations/${conversationId}/messages`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '[]',
        });
      },
    );
    await page.route(
      `http://localhost:3000/conversations/${conversationId}/read`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ conversationId, unreadCount: 0 }),
        });
      },
    );
    await page.route('http://localhost:3000/billing/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          planType: 'prepaid',
          balanceCents: 2500,
          transactions: [],
        }),
      });
    });
    await page.goto(`/conversations/${conversationId}`);
    await expect(page).toHaveURL(new RegExp(`/conversations/${conversationId}$`));
    await expect(page.getByRole('heading', { name: 'Maria Oliveira' })).toBeVisible();
    await expect(page.getByText('Ainda não há mensagens nesta conversa.')).toBeVisible();
  });

  test('only exposes onboarding navigation while the current session still needs setup', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.evaluate((session) => {
      localStorage.setItem('bcb.session', session);
    }, storeSession(true));
    await page.goto('/login');

    await expect(page.getByRole('link', { name: 'Onboarding', exact: true })).toBeHidden();

    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/conversations$/);

    await page.evaluate((session) => {
      localStorage.setItem('bcb.session', session);
    }, storeSession(false));
    await page.goto('/login');

    await expect(page.getByRole('link', { name: 'Onboarding', exact: true })).toBeVisible();
  });
});
