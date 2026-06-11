import { expect, test, type Page, type Route } from '@playwright/test';

const apiBaseUrl = 'http://localhost:3000';
const clientId = '550e8400-e29b-41d4-a716-446655440001';

function activeSession(planType: 'prepaid' | 'postpaid'): string {
  return JSON.stringify({
    token: `billing-${planType}-token`,
    requiresOnboarding: false,
    client: {
      id: clientId,
      name: planType === 'prepaid' ? 'Empresa ABC' : 'Empresa Pós',
      documentId: planType === 'prepaid' ? '11222333000181' : '11444777000161',
      documentType: planType === 'prepaid' ? 'CNPJ' : 'CNPJ',
      role: 'client',
      planType,
      active: true,
      onboardingCompleted: true,
      balanceCents: planType === 'prepaid' ? 2500 : 0,
      monthlyLimitCents: planType === 'postpaid' ? 10000 : undefined,
      monthlyUsedCents: planType === 'postpaid' ? 2500 : 0,
    },
  });
}

async function seedSession(page: Page, planType: 'prepaid' | 'postpaid'): Promise<void> {
  await page.goto('/login');
  await page.evaluate((session) => {
    localStorage.setItem('bcb.session', session);
  }, activeSession(planType));
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('billing page', () => {
  test('shows prepaid balance and transaction history from the billing API', async ({ page }) => {
    await seedSession(page, 'prepaid');
    await page.route(`${apiBaseUrl}/billing/me`, async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer billing-prepaid-token');
      await fulfillJson(route, {
        planType: 'prepaid',
        balanceCents: 2450,
        transactions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440101',
            type: 'credit',
            amountCents: 2500,
            messageId: null,
            paymentIntentId: '550e8400-e29b-41d4-a716-446655440201',
            createdAt: '2026-06-10T12:00:00.000Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440102',
            type: 'debit',
            amountCents: 50,
            messageId: '550e8400-e29b-41d4-a716-446655440301',
            paymentIntentId: null,
            createdAt: '2026-06-10T12:05:00.000Z',
          },
        ],
      });
    });

    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: 'Cobrança' })).toBeVisible();
    await expect(page.getByText('Plano Pré-pago')).toBeVisible();
    await expect(page.getByText('Saldo disponível')).toBeVisible();
    await expect(page.getByText('R$ 24,50')).toBeVisible();
    await expect(page.getByRole('row', { name: /Crédito.*\+R\$ 25,00/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Débito.*-R\$ 0,50/ })).toBeVisible();
  });

  test('shows postpaid limit, usage and remaining balance from the billing API', async ({
    page,
  }) => {
    await seedSession(page, 'postpaid');
    await page.route(`${apiBaseUrl}/billing/me`, async (route) => {
      expect(route.request().headers().authorization).toBe('Bearer billing-postpaid-token');
      await fulfillJson(route, {
        planType: 'postpaid',
        monthlyLimitCents: 10000,
        monthlyUsedCents: 2500,
        remainingCents: 7500,
        usageMonth: '2026-06',
        transactions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440111',
            type: 'usage',
            amountCents: 25,
            messageId: '550e8400-e29b-41d4-a716-446655440311',
            paymentIntentId: null,
            createdAt: '2026-06-10T13:00:00.000Z',
          },
        ],
      });
    });

    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: 'Cobrança' })).toBeVisible();
    await expect(page.getByText('Plano Pós-pago')).toBeVisible();
    await expect(page.getByText('Limite mensal')).toBeVisible();
    await expect(page.getByText('R$ 100,00')).toBeVisible();
    await expect(page.getByText('Usado no mês')).toBeVisible();
    await expect(page.getByText('R$ 25,00')).toBeVisible();
    await expect(page.getByText('Restante')).toBeVisible();
    await expect(page.getByText('R$ 75,00')).toBeVisible();
    await expect(page.getByText('2026-06')).toBeVisible();
    await expect(page.getByRole('row', { name: /Uso.*-R\$ 0,25/ })).toBeVisible();
  });
});
