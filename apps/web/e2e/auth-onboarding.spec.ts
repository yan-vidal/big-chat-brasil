import { expect, test, type Page, type Route } from '@playwright/test';

const clientId = '550e8400-e29b-41d4-a716-446655440001';
const pixIntentId = '550e8400-e29b-41d4-a716-446655440099';

function authSessionResponse(overrides: { requiresOnboarding: boolean; name?: string }) {
  return {
    token: overrides.requiresOnboarding ? 'token-new-client' : 'token-active-client',
    requiresOnboarding: overrides.requiresOnboarding,
    client: {
      id: clientId,
      name: overrides.name ?? (overrides.requiresOnboarding ? 'Cliente BCB' : 'Empresa ABC'),
      documentId: overrides.requiresOnboarding ? '52998224725' : '11222333000181',
      documentType: overrides.requiresOnboarding ? 'CPF' : 'CNPJ',
      role: 'client',
      planType: 'prepaid',
      active: true,
      onboardingCompleted: !overrides.requiresOnboarding,
      balanceCents: overrides.requiresOnboarding ? 0 : 2500,
      monthlyUsedCents: 0,
    },
  };
}

async function seedSession(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(
    (session) => {
      localStorage.setItem('bcb.session', JSON.stringify(session));
    },
    authSessionResponse({ requiresOnboarding: true }),
  );
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('login and onboarding flow', () => {
  test('validates documents before calling the auth API', async ({ page }) => {
    let authCalled = false;
    await page.route('**/auth/session', async (route) => {
      authCalled = true;
      await route.abort();
    });

    await page.goto('/login');
    await page.getByLabel('Documento').fill('123');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Documento inválido')).toBeVisible();
    expect(authCalled).toBe(false);
  });

  test('redirects active clients to conversations after login', async ({ page }) => {
    await page.route('**/auth/session', async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        documentId: '11222333000181',
        documentType: 'CNPJ',
        password: 'Demo@123',
      });
      await fulfillJson(route, authSessionResponse({ requiresOnboarding: false }));
    });

    await page.goto('/login');
    await page.getByLabel('Documento').fill('11.222.333/0001-81');
    await expect(page.getByText('CNPJ', { exact: true })).toBeVisible();
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/conversations$/);
    await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible();
  });

  test('redirects new clients to onboarding after auth auto-registration', async ({ page }) => {
    await page.route('**/auth/session', async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        documentId: '52998224725',
        documentType: 'CPF',
        password: 'Demo@123',
      });
      await fulfillJson(route, authSessionResponse({ requiresOnboarding: true }));
    });

    await page.goto('/login');
    await page.getByLabel('Documento').fill('529.982.247-25');
    await expect(page.getByText('CPF', { exact: true })).toBeVisible();
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'Onboarding' })).toBeVisible();
  });

  test('activates a prepaid client through simulated PIX', async ({ page }) => {
    await seedSession(page);

    await page.route('**/billing/onboarding', async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer token-new-client');
      expect(route.request().postDataJSON()).toEqual({
        name: 'Empresa Nova',
        planType: 'prepaid',
      });
      await fulfillJson(route, {
        client: {
          ...authSessionResponse({ requiresOnboarding: true, name: 'Empresa Nova' }).client,
          name: 'Empresa Nova',
        },
      });
    });
    await page.route('**/billing/pix-intents', async (route) => {
      expect(route.request().postDataJSON()).toEqual({ amountCents: 5000 });
      await fulfillJson(route, {
        id: pixIntentId,
        method: 'pix',
        amountCents: 5000,
        status: 'pending',
        confirmedAt: null,
        createdAt: '2026-06-10T12:00:00.000Z',
      });
    });
    await page.route(`**/billing/pix-intents/${pixIntentId}/confirm`, async (route) => {
      await fulfillJson(route, {
        paymentIntent: {
          id: pixIntentId,
          method: 'pix',
          amountCents: 5000,
          status: 'confirmed',
          confirmedAt: '2026-06-10T12:00:05.000Z',
          createdAt: '2026-06-10T12:00:00.000Z',
        },
        balanceCents: 5000,
      });
    });

    await page.goto('/onboarding');
    await page.getByLabel('Nome').fill('Empresa Nova');
    await page.getByLabel('Crédito inicial').selectOption('5000');
    await page.getByRole('button', { name: 'Gerar PIX' }).click();
    await expect(page.getByText('PIX simulado pendente')).toBeVisible();
    await page.getByRole('button', { name: 'Já paguei' }).click();

    await expect(page).toHaveURL(/\/conversations$/);
    await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible();
  });

  test('activates a postpaid client with a monthly limit', async ({ page }) => {
    await seedSession(page);

    await page.route('**/billing/onboarding', async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        name: 'Empresa Pós',
        planType: 'postpaid',
        monthlyLimitCents: 10000,
      });
      await fulfillJson(route, {
        client: {
          ...authSessionResponse({ requiresOnboarding: false, name: 'Empresa Pós' }).client,
          name: 'Empresa Pós',
          planType: 'postpaid',
          monthlyLimitCents: 10000,
          monthlyUsedCents: 0,
          balanceCents: 0,
        },
      });
    });

    await page.goto('/onboarding');
    await page.getByLabel('Nome').fill('Empresa Pós');
    await page.getByLabel('Pós-pago').check();
    await page.getByLabel('Limite mensal').selectOption('10000');
    await page.getByRole('button', { name: 'Ativar plano' }).click();

    await expect(page).toHaveURL(/\/conversations$/);
    await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible();
  });
});
