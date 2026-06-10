import { expect, test, type Page, type Route } from '@playwright/test';

const clientId = '550e8400-e29b-41d4-a716-446655440001';
const apiBaseUrl = 'http://localhost:3000';
const conversationId = '550e8400-e29b-41d4-a716-446655440011';
const secondConversationId = '550e8400-e29b-41d4-a716-446655440012';
const recipientId = '550e8400-e29b-41d4-a716-446655440021';
const newRecipientId = '550e8400-e29b-41d4-a716-446655440022';
const sentMessageId = '550e8400-e29b-41d4-a716-446655440031';

function activeSession(): string {
  return JSON.stringify({
    token: 'chat-test-token',
    requiresOnboarding: false,
    client: {
      id: clientId,
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
  });
}

async function seedChatSession(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate((session) => {
    localStorage.setItem('bcb.session', session);
    localStorage.setItem('bcb.e2e.realtime', 'true');
  }, activeSession());
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function emitRealtime(page: Page, event: string, payload: unknown): Promise<void> {
  await page.evaluate(
    (detail) => {
      window.dispatchEvent(new CustomEvent('bcb:e2e-realtime', { detail }));
    },
    { event, payload },
  );
}

const mariaConversation = {
  id: conversationId,
  recipientId,
  recipientName: 'Maria Oliveira',
  lastMessageContent: 'Pedido recebido, vou verificar.',
  lastMessageAt: '2026-06-10T12:00:00.000Z',
  unreadCount: 2,
};

const carlosConversation = {
  id: secondConversationId,
  recipientId: newRecipientId,
  recipientName: 'Carlos Pereira',
  lastMessageContent: 'Obrigado pelo retorno.',
  lastMessageAt: '2026-06-10T11:30:00.000Z',
  unreadCount: 0,
};

test.describe('integrated chat web', () => {
  test('translates the conversation list controls', async ({ page }) => {
    await seedChatSession(page);
    await page.route(`${apiBaseUrl}/billing/me`, async (route) => {
      await fulfillJson(route, {
        planType: 'prepaid',
        balanceCents: 2500,
        transactions: [],
      });
    });
    await page.route(`${apiBaseUrl}/conversations`, async (route) => {
      await fulfillJson(route, [mariaConversation]);
    });

    await page.goto('/conversations');
    await page.getByLabel('Idioma').selectOption('en-US');

    await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New conversation' })).toBeVisible();
    await expect(page.getByLabel('Search conversations')).toBeVisible();
  });

  test('loads a direct conversation, sends an urgent message and applies realtime events', async ({
    page,
  }) => {
    let readCalled = false;
    let sentPayload: unknown;

    await seedChatSession(page);
    await page.route(`${apiBaseUrl}/billing/me`, async (route) => {
      await fulfillJson(route, {
        planType: 'prepaid',
        balanceCents: 2500,
        transactions: [],
      });
    });
    await page.route(`${apiBaseUrl}/conversations/${conversationId}`, async (route) => {
      await fulfillJson(route, { ...mariaConversation, unreadCount: 0 });
    });
    await page.route(`${apiBaseUrl}/conversations/${conversationId}/messages`, async (route) => {
      await fulfillJson(route, [
        {
          id: '550e8400-e29b-41d4-a716-446655440041',
          conversationId,
          content: 'Olá, preciso de ajuda com meu pedido.',
          senderType: 'user',
          timestamp: '2026-06-10T11:58:00.000Z',
          priority: 'normal',
          status: 'read',
          cost: 0,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440042',
          conversationId,
          content: 'Pedido recebido, vou verificar.',
          senderType: 'client',
          timestamp: '2026-06-10T12:00:00.000Z',
          priority: 'normal',
          status: 'delivered',
          cost: 25,
        },
      ]);
    });
    await page.route(`${apiBaseUrl}/conversations/${conversationId}/read`, async (route) => {
      readCalled = true;
      await fulfillJson(route, { conversationId, unreadCount: 0 });
    });
    await page.route(`${apiBaseUrl}/messages`, async (route) => {
      sentPayload = route.request().postDataJSON();
      await fulfillJson(route, {
        id: sentMessageId,
        status: 'queued',
        timestamp: '2026-06-10T12:01:00.000Z',
        estimatedDelivery: '2026-06-10T12:01:30.000Z',
        cost: 50,
        currentBalance: 2450,
      });
    });

    await page.goto(`/conversations/${conversationId}`);

    await expect(page.getByRole('heading', { name: 'Maria Oliveira' })).toBeVisible();
    await expect(page.getByText('Saldo R$ 25,00')).toBeVisible();
    await expect(page.getByText('Olá, preciso de ajuda com meu pedido.')).toBeVisible();
    expect(readCalled).toBe(true);

    await page.getByLabel('Urgente').check();
    await page.getByLabel('Mensagem').fill('Resolver com prioridade, por favor.');
    await page.getByRole('button', { name: 'Enviar' }).click();

    expect(sentPayload).toEqual({
      conversationId,
      content: 'Resolver com prioridade, por favor.',
      priority: 'urgent',
    });
    const sentBubble = page
      .getByTestId('message-bubble')
      .filter({ hasText: 'Resolver com prioridade, por favor.' });
    await expect(sentBubble).toBeVisible();
    await expect(sentBubble.getByText('Na fila')).toBeVisible();
    await expect(sentBubble.getByText('Urgente')).toBeVisible();

    await emitRealtime(page, 'message.status', {
      messageId: sentMessageId,
      conversationId,
      status: 'delivered',
      occurredAt: '2026-06-10T12:01:05.000Z',
    });
    await expect(sentBubble.getByText('Entregue')).toBeVisible();

    await emitRealtime(page, 'typing.started', { conversationId, senderType: 'user' });
    await expect(page.getByText('Maria está escrevendo...')).toBeVisible();

    await emitRealtime(page, 'message.created', {
      message: {
        id: '550e8400-e29b-41d4-a716-446655440051',
        conversationId,
        content: 'Já recebi e vou priorizar agora.',
        senderType: 'user',
        timestamp: '2026-06-10T12:01:10.000Z',
        priority: 'normal',
        status: 'delivered',
        cost: 0,
      },
    });
    await emitRealtime(page, 'typing.stopped', { conversationId, senderType: 'user' });

    await expect(page.getByText('Maria está escrevendo...')).toBeHidden();
    await expect(page.getByText('Já recebi e vou priorizar agora.')).toBeVisible();

    await emitRealtime(page, 'message.status', {
      messageId: sentMessageId,
      conversationId,
      status: 'read',
      occurredAt: '2026-06-10T12:01:15.000Z',
    });
    await expect(sentBubble.getByText('Lida')).toBeVisible();
  });

  test('lists conversations with billing, search, unread badges and recipient compose', async ({
    page,
  }) => {
    let recipientSendPayload: unknown;

    await seedChatSession(page);
    await page.route(`${apiBaseUrl}/billing/me`, async (route) => {
      await fulfillJson(route, {
        planType: 'prepaid',
        balanceCents: 2500,
        transactions: [],
      });
    });
    await page.route(`${apiBaseUrl}/conversations`, async (route) => {
      await fulfillJson(route, [mariaConversation, carlosConversation]);
    });
    await page.route(`${apiBaseUrl}/recipients`, async (route) => {
      await fulfillJson(route, [
        { id: recipientId, name: 'Maria Oliveira' },
        { id: newRecipientId, name: 'Carlos Pereira' },
      ]);
    });
    await page.route(`${apiBaseUrl}/messages`, async (route) => {
      recipientSendPayload = route.request().postDataJSON();
      await fulfillJson(route, {
        id: '550e8400-e29b-41d4-a716-446655440061',
        status: 'queued',
        timestamp: '2026-06-10T12:05:00.000Z',
        estimatedDelivery: '2026-06-10T12:05:30.000Z',
        cost: 25,
        currentBalance: 2475,
      });
    });

    await page.goto('/conversations');

    await expect(page.getByText('Saldo R$ 25,00')).toBeVisible();
    await expect(page.getByRole('link', { name: /Maria Oliveira/ })).toBeVisible();
    await expect(page.getByText('2 não lidas')).toBeVisible();
    await expect(page.getByRole('link', { name: /Carlos Pereira/ })).toBeVisible();

    await emitRealtime(page, 'conversation.updated', {
      conversationId,
      lastMessageContent: 'Resposta nova do simulador.',
      lastMessageAt: '2026-06-10T12:04:00.000Z',
      unreadCount: 3,
    });
    await expect(page.getByText('Resposta nova do simulador.')).toBeVisible();
    await expect(page.getByText('3 não lidas')).toBeVisible();

    await page.getByLabel('Buscar conversa').fill('carlos');
    await expect(page.getByRole('link', { name: /Maria Oliveira/ })).toBeHidden();
    await expect(page.getByRole('link', { name: /Carlos Pereira/ })).toBeVisible();

    await page.getByRole('button', { name: 'Nova conversa' }).click();
    await page.getByLabel('Destinatário').selectOption(newRecipientId);
    await page.getByLabel('Mensagem inicial').fill('Olá, podemos falar agora?');
    await page.getByRole('button', { name: 'Enviar nova conversa' }).click();

    expect(recipientSendPayload).toEqual({
      recipientId: newRecipientId,
      content: 'Olá, podemos falar agora?',
      priority: 'normal',
    });
    await expect(page.getByText('Mensagem inicial enviada')).toBeVisible();
  });
});
