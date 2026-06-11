import { expect, test, type Page } from '@playwright/test';

test.describe('full-stack chat flow', () => {
  async function login(page: Page, document: string): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Documento').fill(document);
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/conversations$/);
  }

  test('logs in with demo credentials, sends an urgent message and receives simulator feedback', async ({
    page,
  }) => {
    await login(page, '11.222.333/0001-81');
    await expect(page.getByRole('heading', { name: 'Conversas' })).toBeVisible();

    await page.getByRole('link', { name: /Maria Oliveira/ }).click();
    await expect(page.getByRole('heading', { name: 'Maria Oliveira' })).toBeVisible();
    await expect(page.getByText('Olá, Maria. Pode confirmar o andamento do pedido?')).toBeVisible();

    const simulatorResponses = page.getByText(
      /Recebido, retorno em instantes\.|Obrigado pelo contato\. Ja estou verificando\.|Certo, vou acompanhar por aqui\./,
    );
    const simulatorResponseCount = await simulatorResponses.count();
    const messageContent = `Teste urgente ${Date.now()}`;
    await page.getByLabel('Urgente').check();
    await page.getByLabel('Mensagem').fill(messageContent);
    await page.getByRole('button', { name: 'Enviar' }).click();

    const sentBubble = page.getByTestId('message-bubble').filter({ hasText: messageContent });
    await expect(sentBubble).toBeVisible();
    await expect(sentBubble.getByText('Urgente', { exact: true })).toBeVisible();
    await expect(sentBubble.getByText(/Na fila|Processando|Enviada|Entregue|Lida/)).toBeVisible();
    await expect(sentBubble.getByText(/Entregue|Lida/)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('Maria está escrevendo...')).toBeVisible({ timeout: 15_000 });
    await expect(simulatorResponses.nth(simulatorResponseCount)).toBeVisible({ timeout: 15_000 });
  });

  test('lets two logged accounts exchange a visible conversation', async ({ page }) => {
    const messageContent = `Mensagem entre contas ${Date.now()}`;
    await login(page, '11.222.333/0001-81');

    await page.getByRole('button', { name: 'Nova conversa' }).click();
    await page.getByLabel('Destinatário').selectOption({ label: 'Cliente Pós-pago Com Limite' });
    await page.getByLabel('Mensagem inicial').fill(messageContent);
    await page.getByRole('button', { name: 'Enviar nova conversa' }).click();
    await expect(page.getByText('Mensagem inicial enviada')).toBeVisible();

    await page.evaluate(() => localStorage.removeItem('bcb.session'));
    await login(page, '11.444.777/0001-61');

    await expect(page.getByRole('link', { name: /Empresa ABC/ })).toBeVisible();
    await page.getByRole('link', { name: /Empresa ABC/ }).click();
    await expect(page.getByRole('heading', { name: 'Empresa ABC' })).toBeVisible();
    await expect(page.getByText(messageContent)).toBeVisible();
  });
});
