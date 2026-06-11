import { ADMIN_DOCUMENT_ID, isValidCnpj, isValidCpf } from '@bcb/shared';
import { DEMO_ACCOUNTS, DEMO_CONVERSATIONS, DEMO_RECIPIENTS } from './seed-data.js';

describe('seed data definitions', () => {
  it('keeps the documented demo account fixtures valid and stable', () => {
    expect(DEMO_ACCOUNTS).toHaveLength(5);
    expect(DEMO_ACCOUNTS.map((account) => account.documentId)).toEqual([
      ADMIN_DOCUMENT_ID,
      '11222333000181',
      '11144477735',
      '11444777000161',
      '12345678909',
    ]);

    for (const account of DEMO_ACCOUNTS) {
      const valid =
        account.documentId === ADMIN_DOCUMENT_ID
          ? true
          : account.documentType === 'CPF'
            ? isValidCpf(account.documentId)
            : isValidCnpj(account.documentId);

      expect(valid).toBe(true);
    }
  });

  it('keeps the default admin as a zeroed reserved CPF account', () => {
    expect(DEMO_ACCOUNTS[0]).toMatchObject({
      key: 'admin',
      documentId: ADMIN_DOCUMENT_ID,
      documentType: 'CPF',
      role: 'admin',
      active: true,
      profile: {
        name: 'Administrador BCB',
        planType: 'prepaid',
        onboardingCompleted: true,
        balanceCents: 0,
        monthlyLimitCents: null,
        monthlyUsedCents: 0,
        usageMonth: null,
      },
    });
  });

  it('defines recipients and seeded conversations for Empresa ABC', () => {
    expect(DEMO_RECIPIENTS.map((recipient) => recipient.name)).toEqual([
      'Maria Oliveira',
      'Carlos Pereira',
      'Ana Costa',
      'Pedro Santos',
    ]);
    expect(DEMO_CONVERSATIONS.length).toBeGreaterThanOrEqual(2);
    expect(
      DEMO_CONVERSATIONS.every(
        (conversation) => conversation.clientDocumentId === '11222333000181',
      ),
    ).toBe(true);
    expect(DEMO_CONVERSATIONS.some((conversation) => conversation.messages.length > 0)).toBe(true);
  });
});
