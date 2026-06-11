import type {
  DocumentType,
  MessagePriority,
  MessageStatus,
  PlanType,
  Role,
  SenderType,
} from '@bcb/shared';
import { ADMIN_DOCUMENT_ID as DEFAULT_ADMIN_DOCUMENT_ID } from '@bcb/shared';

export type DemoAccount = {
  readonly key: string;
  readonly documentId: string;
  readonly documentType: DocumentType;
  readonly password: string;
  readonly role: Role;
  readonly active: boolean;
  readonly profile: {
    readonly name: string;
    readonly planType: PlanType;
    readonly onboardingCompleted: boolean;
    readonly balanceCents: number;
    readonly monthlyLimitCents: number | null;
    readonly monthlyUsedCents: number;
    readonly usageMonth: string | null;
  };
};

export type DemoRecipient = {
  readonly key: string;
  readonly name: string;
};

export type DemoMessage = {
  readonly senderType: SenderType;
  readonly content: string;
  readonly priority: MessagePriority;
  readonly status: MessageStatus;
  readonly costCents: number;
  readonly createdAt: Date;
  readonly processedAt: Date | null;
};

export type DemoConversation = {
  readonly clientDocumentId: string;
  readonly recipientKey: string;
  readonly unreadCount: number;
  readonly messages: readonly DemoMessage[];
};

const usageMonth = new Date().toISOString().slice(0, 7);
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

export function getSeedAdminPassword(): string {
  const password = process.env.BCB_ADMIN_PASSWORD?.trim();

  return password && password.length > 0 ? password : DEFAULT_ADMIN_PASSWORD;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    key: 'admin',
    documentId: DEFAULT_ADMIN_DOCUMENT_ID,
    documentType: 'CPF',
    password: getSeedAdminPassword(),
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
  },
  {
    key: 'empresa-abc',
    documentId: '11222333000181',
    documentType: 'CNPJ',
    password: 'Demo@123',
    role: 'client',
    active: true,
    profile: {
      name: 'Empresa ABC',
      planType: 'prepaid',
      onboardingCompleted: true,
      balanceCents: 2500,
      monthlyLimitCents: null,
      monthlyUsedCents: 0,
      usageMonth: null,
    },
  },
  {
    key: 'prepaid-empty',
    documentId: '11144477735',
    documentType: 'CPF',
    password: 'Demo@123',
    role: 'client',
    active: true,
    profile: {
      name: 'Cliente Pré-pago Sem Saldo',
      planType: 'prepaid',
      onboardingCompleted: true,
      balanceCents: 0,
      monthlyLimitCents: null,
      monthlyUsedCents: 0,
      usageMonth: null,
    },
  },
  {
    key: 'postpaid-limit',
    documentId: '11444777000161',
    documentType: 'CNPJ',
    password: 'Demo@123',
    role: 'client',
    active: true,
    profile: {
      name: 'Cliente Pós-pago Com Limite',
      planType: 'postpaid',
      onboardingCompleted: true,
      balanceCents: 0,
      monthlyLimitCents: 10000,
      monthlyUsedCents: 0,
      usageMonth,
    },
  },
  {
    key: 'postpaid-at-limit',
    documentId: '12345678909',
    documentType: 'CPF',
    password: 'Demo@123',
    role: 'client',
    active: true,
    profile: {
      name: 'Cliente Pós-pago No Limite',
      planType: 'postpaid',
      onboardingCompleted: true,
      balanceCents: 0,
      monthlyLimitCents: 1000,
      monthlyUsedCents: 1000,
      usageMonth,
    },
  },
];

export const DEMO_RECIPIENTS: readonly DemoRecipient[] = [
  { key: 'maria-oliveira', name: 'Maria Oliveira' },
  { key: 'carlos-pereira', name: 'Carlos Pereira' },
  { key: 'ana-costa', name: 'Ana Costa' },
  { key: 'pedro-santos', name: 'Pedro Santos' },
];

export const DEMO_CONVERSATIONS: readonly DemoConversation[] = [
  {
    clientDocumentId: '11222333000181',
    recipientKey: 'maria-oliveira',
    unreadCount: 1,
    messages: [
      {
        senderType: 'client',
        content: 'Olá, Maria. Pode confirmar o andamento do pedido?',
        priority: 'normal',
        status: 'delivered',
        costCents: 25,
        createdAt: new Date('2026-06-09T12:00:00.000Z'),
        processedAt: new Date('2026-06-09T12:00:05.000Z'),
      },
      {
        senderType: 'user',
        content: 'Pedido confirmado. Envio programado para hoje.',
        priority: 'normal',
        status: 'read',
        costCents: 0,
        createdAt: new Date('2026-06-09T12:02:00.000Z'),
        processedAt: new Date('2026-06-09T12:02:00.000Z'),
      },
      {
        senderType: 'user',
        content: 'Acabei de anexar a nota fiscal ao atendimento.',
        priority: 'normal',
        status: 'delivered',
        costCents: 0,
        createdAt: new Date('2026-06-09T12:05:00.000Z'),
        processedAt: new Date('2026-06-09T12:05:00.000Z'),
      },
    ],
  },
  {
    clientDocumentId: '11222333000181',
    recipientKey: 'carlos-pereira',
    unreadCount: 0,
    messages: [],
  },
];
