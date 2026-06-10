import { expect, test, type Page, type Route } from '@playwright/test';

const adminClientId = '550e8400-e29b-41d4-a716-4466554400aa';
const prepaidClientId = '550e8400-e29b-41d4-a716-4466554400bb';
const postpaidClientId = '550e8400-e29b-41d4-a716-4466554400cc';

const adminSession = {
  token: 'token-admin',
  requiresOnboarding: false,
  client: {
    id: adminClientId,
    name: 'Administrador BCB',
    documentId: '00000000000',
    documentType: 'CPF',
    role: 'admin',
    planType: 'prepaid',
    active: true,
    onboardingCompleted: true,
    balanceCents: 0,
    monthlyUsedCents: 0,
  },
};

const clientSession = {
  token: 'token-client',
  requiresOnboarding: false,
  client: {
    id: prepaidClientId,
    name: 'Empresa ABC',
    documentId: '11222333000181',
    documentType: 'CNPJ',
    role: 'client',
    planType: 'prepaid',
    active: true,
    onboardingCompleted: true,
    balanceCents: 2500,
    monthlyUsedCents: 0,
  },
};

const clients = [
  {
    id: adminClientId,
    accountId: '550e8400-e29b-41d4-a716-4466554400a1',
    name: 'Administrador BCB',
    documentId: '00000000000',
    documentType: 'CPF',
    role: 'admin',
    active: true,
    planType: 'prepaid',
    onboardingCompleted: true,
    balanceCents: 0,
    monthlyUsedCents: 0,
    usageMonth: null,
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
  {
    id: prepaidClientId,
    accountId: '550e8400-e29b-41d4-a716-4466554400b1',
    name: 'Cliente Pré-pago',
    documentId: '11144477735',
    documentType: 'CPF',
    role: 'client',
    active: true,
    planType: 'prepaid',
    onboardingCompleted: true,
    balanceCents: 0,
    monthlyUsedCents: 0,
    usageMonth: null,
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
  {
    id: postpaidClientId,
    accountId: '550e8400-e29b-41d4-a716-4466554400c1',
    name: 'Cliente Pós-pago',
    documentId: '11444777000161',
    documentType: 'CNPJ',
    role: 'client',
    active: true,
    planType: 'postpaid',
    onboardingCompleted: true,
    balanceCents: 0,
    monthlyLimitCents: 10000,
    monthlyUsedCents: 0,
    usageMonth: '2026-06',
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
];

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function seedSession(page: Page, session: typeof adminSession | typeof clientSession) {
  await page.goto('/login');
  await page.evaluate(
    (value) => localStorage.setItem('bcb.session', JSON.stringify(value)),
    session,
  );
}

test.describe('admin console', () => {
  test('redirects the reserved admin login to the administration panel', async ({ page }) => {
    await page.route('**/auth/session', async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        documentId: '00000000000',
        documentType: 'CPF',
        password: 'Admin@123',
      });
      await fulfillJson(route, adminSession);
    });
    await page.route('**/admin/clients', async (route) => fulfillJson(route, clients));

    await page.goto('/login');
    await page.getByLabel('Documento').fill('000.000.000-00');
    await expect(page.getByText('CPF', { exact: true })).toBeVisible();
    await page.getByLabel('Senha').fill('Admin@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible();
  });

  test('keeps the admin route restricted to admin sessions', async ({ page }) => {
    await seedSession(page, clientSession);

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/conversations$/);
  });

  test('lists clients and sends management actions without a role payload', async ({ page }) => {
    const requests: Array<{ url: string; body: unknown }> = [];
    await page.setViewportSize({ width: 900, height: 520 });
    await seedSession(page, adminSession);
    await page.route('**/admin/clients', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, clients);
        return;
      }

      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...clients[1],
          id: '550e8400-e29b-41d4-a716-4466554400dd',
          documentId: '52998224725',
          name: 'Cliente Novo',
          balanceCents: 1000,
        }),
      });
    });
    await page.route(`**/admin/clients/${prepaidClientId}/credits`, async (route) => {
      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await fulfillJson(route, { ...clients[1], balanceCents: 1500 });
    });
    await page.route(`**/admin/clients/${postpaidClientId}/limit`, async (route) => {
      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await fulfillJson(route, { ...clients[2], monthlyLimitCents: 20000 });
    });
    await page.route(`**/admin/clients/${prepaidClientId}/status`, async (route) => {
      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await fulfillJson(route, { ...clients[1], active: false });
    });
    await page.route(`**/admin/clients/${prepaidClientId}/plan`, async (route) => {
      requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      await fulfillJson(route, {
        ...clients[1],
        planType: 'postpaid',
        monthlyLimitCents: 30000,
      });
    });

    await page.goto('/admin');
    await expect(page.getByRole('cell', { name: 'Administrador BCB' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Cliente Pré-pago' })).toBeVisible();

    await page.getByLabel('Documento do novo cliente').fill('529.982.247-25');
    await page.getByLabel('Senha do novo cliente').fill('Client@123');
    await page.getByLabel('Nome do novo cliente').fill('Cliente Novo');
    await page.getByLabel('Saldo inicial').fill('1000');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Criar cliente' }).click();
    await expect(page.getByText('Cliente criado')).toBeVisible();
    await expect(page.getByLabel('Documento do novo cliente')).toHaveValue('');
    await expect(page.getByLabel('Senha do novo cliente')).toHaveValue('');
    await expect(page.getByLabel('Nome do novo cliente')).toHaveValue('');
    await expect(page.getByLabel('Saldo inicial')).toHaveValue('0');
    await expect(page.getByLabel('Limite mensal inicial')).toHaveValue('10000');
    await expect(page.getByRole('row', { name: /Cliente Novo.*52998224725/ })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.getByLabel('Crédito pré-pago').fill('1500');
    await page.getByRole('button', { name: 'Adicionar crédito' }).click();
    await expect(page.getByText('Crédito adicionado')).toBeVisible();

    await page.getByLabel('Novo limite pós-pago').fill('20000');
    await page.getByRole('button', { name: 'Atualizar limite' }).click();
    await expect(page.getByText('Limite atualizado')).toBeVisible();

    await page
      .getByRole('row')
      .filter({ hasText: 'Cliente Pré-pago' })
      .getByRole('button', { name: 'Inativar' })
      .click();
    await expect(page.getByText('Status atualizado')).toBeVisible();

    await page.getByLabel('Cliente para converter').selectOption(prepaidClientId);
    await page.getByLabel('Novo plano').selectOption('postpaid');
    await page.getByLabel('Limite mensal ao converter para pós-pago').fill('30000');
    await page.getByRole('button', { name: 'Converter plano' }).click();
    await expect(page.getByText('Plano convertido')).toBeVisible();

    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          body: expect.objectContaining({
            documentId: '52998224725',
            documentType: 'CPF',
            password: 'Client@123',
            name: 'Cliente Novo',
            planType: 'prepaid',
            initialBalanceCents: 1000,
          }),
        }),
        expect.objectContaining({ body: { amountCents: 1500 } }),
        expect.objectContaining({ body: { monthlyLimitCents: 20000 } }),
        expect.objectContaining({ body: { active: false } }),
        expect.objectContaining({ body: { planType: 'postpaid', monthlyLimitCents: 30000 } }),
      ]),
    );
    expect(requests.some((request) => Object.hasOwn(request.body as object, 'role'))).toBe(false);
  });
});
