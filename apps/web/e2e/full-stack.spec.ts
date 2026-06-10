import { expect, test } from '@playwright/test';

test.describe('full-stack chat flow', () => {
  test('logs in with demo credentials, sends an urgent message and receives simulator feedback', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Documento').fill('11.222.333/0001-81');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/conversations$/);
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
    await expect(sentBubble.getByText('Na fila')).toBeVisible();
    await expect(sentBubble.getByText(/Entregue|Lida/)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('Maria está escrevendo...')).toBeVisible({ timeout: 15_000 });
    await expect(simulatorResponses.nth(simulatorResponseCount)).toBeVisible({ timeout: 15_000 });
  });
});
