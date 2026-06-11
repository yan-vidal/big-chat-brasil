import {
  BILLING_TRANSACTION_TYPE_VALUES,
  DOCUMENT_TYPE_VALUES,
  MESSAGE_PRIORITY_VALUES,
  MESSAGE_STATUS_VALUES,
  PAYMENT_INTENT_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PLAN_TYPE_VALUES,
  ROLE_VALUES,
  SENDER_TYPE_VALUES,
} from '@bcb/shared';
import type { OpenAPIObject } from '@nestjs/swagger';

type SchemaObject = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string];
type ReferenceObject = { readonly $ref: string };

export const OPENAPI_SCHEMA_NAMES = {
  apiError: 'ApiError',
  authSessionRequest: 'AuthSessionRequest',
  authenticatedClient: 'AuthenticatedClient',
  authSessionResponse: 'AuthSessionResponse',
  adminClientResponse: 'AdminClientResponse',
  adminCreatePrepaidClientRequest: 'AdminCreatePrepaidClientRequest',
  adminCreatePostpaidClientRequest: 'AdminCreatePostpaidClientRequest',
  adminCreateClientRequest: 'AdminCreateClientRequest',
  adminUpdateClientStatusRequest: 'AdminUpdateClientStatusRequest',
  adminAddCreditRequest: 'AdminAddCreditRequest',
  adminUpdateLimitRequest: 'AdminUpdateLimitRequest',
  adminConvertToPrepaidRequest: 'AdminConvertToPrepaidRequest',
  adminConvertToPostpaidRequest: 'AdminConvertToPostpaidRequest',
  adminConvertPlanRequest: 'AdminConvertPlanRequest',
  healthResponse: 'HealthResponse',
  prepaidOnboardingRequest: 'PrepaidOnboardingRequest',
  postpaidOnboardingRequest: 'PostpaidOnboardingRequest',
  onboardingRequest: 'OnboardingRequest',
  onboardingResponse: 'OnboardingResponse',
  createPixIntentRequest: 'CreatePixIntentRequest',
  paymentIntentResponse: 'PaymentIntentResponse',
  confirmPixResponse: 'ConfirmPixResponse',
  billingTransactionResponse: 'BillingTransactionResponse',
  prepaidBillingSummaryResponse: 'PrepaidBillingSummaryResponse',
  postpaidBillingSummaryResponse: 'PostpaidBillingSummaryResponse',
  billingSummaryResponse: 'BillingSummaryResponse',
  recipientResponse: 'RecipientResponse',
  conversationResponse: 'ConversationResponse',
  markConversationReadResponse: 'MarkConversationReadResponse',
  sendMessageRequest: 'SendMessageRequest',
  sendMessageResponse: 'SendMessageResponse',
  messageResponse: 'MessageResponse',
  messageStatusResponse: 'MessageStatusResponse',
  queueStatusResponse: 'QueueStatusResponse',
} as const;

const idSchema: SchemaObject = {
  type: 'string',
  format: 'uuid',
  example: '550e8400-e29b-41d4-a716-446655440001',
};
const isoDateTimeSchema: SchemaObject = {
  type: 'string',
  format: 'date-time',
  example: '2026-06-10T12:00:00.000Z',
};
const moneyCentsSchema: SchemaObject = {
  type: 'integer',
  minimum: 0,
  example: 2500,
};

export function schemaRef(name: keyof typeof OPENAPI_SCHEMA_NAMES): ReferenceObject {
  return { $ref: `#/components/schemas/${OPENAPI_SCHEMA_NAMES[name]}` };
}

export const OPENAPI_SCHEMAS: Record<string, SchemaObject> = {
  [OPENAPI_SCHEMA_NAMES.apiError]: {
    type: 'object',
    required: ['code', 'message'],
    properties: {
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      message: { type: 'string', example: 'Payload invalido' },
      details: { nullable: true },
    },
  },
  [OPENAPI_SCHEMA_NAMES.healthResponse]: {
    type: 'object',
    required: ['service', 'status'],
    properties: {
      service: { type: 'string', enum: ['@bcb/api'] },
      status: { type: 'string', enum: ['ok'] },
    },
  },
  [OPENAPI_SCHEMA_NAMES.authSessionRequest]: {
    type: 'object',
    required: ['documentId', 'documentType', 'password'],
    properties: {
      documentId: { type: 'string', example: '11222333000181' },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPE_VALUES] },
      password: { type: 'string', format: 'password', example: 'Demo@123' },
    },
  },
  [OPENAPI_SCHEMA_NAMES.authenticatedClient]: {
    type: 'object',
    required: [
      'id',
      'name',
      'documentId',
      'documentType',
      'role',
      'planType',
      'active',
      'onboardingCompleted',
    ],
    properties: {
      id: idSchema,
      name: { type: 'string', nullable: true, example: 'Empresa ABC' },
      documentId: { type: 'string', example: '11222333000181' },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPE_VALUES] },
      role: { type: 'string', enum: [...ROLE_VALUES] },
      planType: { type: 'string', enum: [...PLAN_TYPE_VALUES], nullable: true },
      active: { type: 'boolean' },
      onboardingCompleted: { type: 'boolean' },
      balanceCents: moneyCentsSchema,
      monthlyLimitCents: moneyCentsSchema,
      monthlyUsedCents: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.authSessionResponse]: {
    type: 'object',
    required: ['token', 'requiresOnboarding', 'client'],
    properties: {
      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      requiresOnboarding: { type: 'boolean' },
      client: schemaRef('authenticatedClient'),
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminClientResponse]: {
    type: 'object',
    required: [
      'id',
      'accountId',
      'name',
      'documentId',
      'documentType',
      'role',
      'active',
      'planType',
      'onboardingCompleted',
      'balanceCents',
      'monthlyUsedCents',
      'usageMonth',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      id: idSchema,
      accountId: idSchema,
      name: { type: 'string', example: 'Empresa ABC' },
      documentId: { type: 'string', example: '11222333000181' },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPE_VALUES] },
      role: { type: 'string', enum: [...ROLE_VALUES], readOnly: true },
      active: { type: 'boolean' },
      planType: { type: 'string', enum: [...PLAN_TYPE_VALUES] },
      onboardingCompleted: { type: 'boolean' },
      balanceCents: moneyCentsSchema,
      monthlyLimitCents: moneyCentsSchema,
      monthlyUsedCents: moneyCentsSchema,
      usageMonth: { type: 'string', nullable: true, example: '2026-06' },
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminCreatePrepaidClientRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['documentId', 'documentType', 'password', 'name', 'planType'],
    properties: {
      documentId: { type: 'string', example: '52998224725' },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPE_VALUES] },
      password: { type: 'string', format: 'password', example: 'Client@123' },
      name: { type: 'string', minLength: 1, maxLength: 120, example: 'Cliente Novo' },
      active: { type: 'boolean' },
      planType: { type: 'string', enum: ['prepaid'] },
      initialBalanceCents: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminCreatePostpaidClientRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['documentId', 'documentType', 'password', 'name', 'planType', 'monthlyLimitCents'],
    properties: {
      documentId: { type: 'string', example: '11444777000161' },
      documentType: { type: 'string', enum: [...DOCUMENT_TYPE_VALUES] },
      password: { type: 'string', format: 'password', example: 'Client@123' },
      name: { type: 'string', minLength: 1, maxLength: 120, example: 'Cliente Pós-pago' },
      active: { type: 'boolean' },
      planType: { type: 'string', enum: ['postpaid'] },
      monthlyLimitCents: { type: 'integer', minimum: 1, example: 10000 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminCreateClientRequest]: {
    oneOf: [
      schemaRef('adminCreatePrepaidClientRequest'),
      schemaRef('adminCreatePostpaidClientRequest'),
    ],
    discriminator: { propertyName: 'planType' },
  },
  [OPENAPI_SCHEMA_NAMES.adminUpdateClientStatusRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['active'],
    properties: {
      active: { type: 'boolean' },
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminAddCreditRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['amountCents'],
    properties: {
      amountCents: { type: 'integer', minimum: 1, example: 1500 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminUpdateLimitRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['monthlyLimitCents'],
    properties: {
      monthlyLimitCents: { type: 'integer', minimum: 1, example: 20000 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminConvertToPrepaidRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['planType'],
    properties: {
      planType: { type: 'string', enum: ['prepaid'] },
      balanceCents: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminConvertToPostpaidRequest]: {
    type: 'object',
    additionalProperties: false,
    required: ['planType', 'monthlyLimitCents'],
    properties: {
      planType: { type: 'string', enum: ['postpaid'] },
      monthlyLimitCents: { type: 'integer', minimum: 1, example: 30000 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.adminConvertPlanRequest]: {
    oneOf: [schemaRef('adminConvertToPrepaidRequest'), schemaRef('adminConvertToPostpaidRequest')],
    discriminator: { propertyName: 'planType' },
  },
  [OPENAPI_SCHEMA_NAMES.prepaidOnboardingRequest]: {
    type: 'object',
    required: ['name', 'planType'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120, example: 'Empresa Nova' },
      planType: { type: 'string', enum: ['prepaid'] },
    },
  },
  [OPENAPI_SCHEMA_NAMES.postpaidOnboardingRequest]: {
    type: 'object',
    required: ['name', 'planType', 'monthlyLimitCents'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120, example: 'Empresa Nova' },
      planType: { type: 'string', enum: ['postpaid'] },
      monthlyLimitCents: { type: 'integer', minimum: 1, example: 10000 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.onboardingRequest]: {
    oneOf: [schemaRef('prepaidOnboardingRequest'), schemaRef('postpaidOnboardingRequest')],
    discriminator: { propertyName: 'planType' },
  },
  [OPENAPI_SCHEMA_NAMES.onboardingResponse]: {
    type: 'object',
    required: ['client'],
    properties: {
      client: schemaRef('authenticatedClient'),
    },
  },
  [OPENAPI_SCHEMA_NAMES.createPixIntentRequest]: {
    type: 'object',
    required: ['amountCents'],
    properties: {
      amountCents: { type: 'integer', minimum: 1, example: 2500 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.paymentIntentResponse]: {
    type: 'object',
    required: ['id', 'method', 'amountCents', 'status', 'confirmedAt', 'createdAt'],
    properties: {
      id: idSchema,
      method: { type: 'string', enum: [...PAYMENT_METHOD_VALUES] },
      amountCents: { type: 'integer', minimum: 1, example: 2500 },
      status: { type: 'string', enum: [...PAYMENT_INTENT_STATUS_VALUES] },
      confirmedAt: { ...isoDateTimeSchema, nullable: true },
      createdAt: isoDateTimeSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.confirmPixResponse]: {
    type: 'object',
    required: ['paymentIntent', 'balanceCents'],
    properties: {
      paymentIntent: schemaRef('paymentIntentResponse'),
      balanceCents: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.billingTransactionResponse]: {
    type: 'object',
    required: ['id', 'type', 'amountCents', 'messageId', 'paymentIntentId', 'createdAt'],
    properties: {
      id: idSchema,
      type: { type: 'string', enum: [...BILLING_TRANSACTION_TYPE_VALUES] },
      amountCents: { type: 'integer', example: -25 },
      messageId: { ...idSchema, nullable: true },
      paymentIntentId: { ...idSchema, nullable: true },
      createdAt: isoDateTimeSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.prepaidBillingSummaryResponse]: {
    type: 'object',
    required: ['planType', 'balanceCents', 'transactions'],
    properties: {
      planType: { type: 'string', enum: ['prepaid'] },
      balanceCents: moneyCentsSchema,
      transactions: { type: 'array', items: schemaRef('billingTransactionResponse') },
    },
  },
  [OPENAPI_SCHEMA_NAMES.postpaidBillingSummaryResponse]: {
    type: 'object',
    required: [
      'planType',
      'monthlyLimitCents',
      'monthlyUsedCents',
      'remainingCents',
      'usageMonth',
      'transactions',
    ],
    properties: {
      planType: { type: 'string', enum: ['postpaid'] },
      monthlyLimitCents: moneyCentsSchema,
      monthlyUsedCents: moneyCentsSchema,
      remainingCents: moneyCentsSchema,
      usageMonth: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', example: '2026-06' },
      transactions: { type: 'array', items: schemaRef('billingTransactionResponse') },
    },
  },
  [OPENAPI_SCHEMA_NAMES.billingSummaryResponse]: {
    oneOf: [
      schemaRef('prepaidBillingSummaryResponse'),
      schemaRef('postpaidBillingSummaryResponse'),
    ],
    discriminator: { propertyName: 'planType' },
  },
  [OPENAPI_SCHEMA_NAMES.recipientResponse]: {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: idSchema,
      name: { type: 'string', example: 'Maria Oliveira' },
    },
  },
  [OPENAPI_SCHEMA_NAMES.conversationResponse]: {
    type: 'object',
    required: [
      'id',
      'recipientId',
      'recipientName',
      'lastMessageContent',
      'lastMessageAt',
      'unreadCount',
    ],
    properties: {
      id: idSchema,
      recipientId: idSchema,
      recipientName: { type: 'string', example: 'Maria Oliveira' },
      lastMessageContent: { type: 'string', nullable: true },
      lastMessageAt: { ...isoDateTimeSchema, nullable: true },
      unreadCount: { type: 'integer', minimum: 0, example: 1 },
    },
  },
  [OPENAPI_SCHEMA_NAMES.markConversationReadResponse]: {
    type: 'object',
    required: ['conversationId', 'unreadCount'],
    properties: {
      conversationId: idSchema,
      unreadCount: { type: 'integer', enum: [0] },
    },
  },
  [OPENAPI_SCHEMA_NAMES.sendMessageRequest]: {
    type: 'object',
    required: ['content', 'priority'],
    properties: {
      conversationId: idSchema,
      recipientId: idSchema,
      content: { type: 'string', minLength: 1, maxLength: 2000, example: 'Olá, podemos falar?' },
      priority: { type: 'string', enum: [...MESSAGE_PRIORITY_VALUES] },
    },
    description:
      'Informe conversationId para conversa existente ou recipientId para nova conversa.',
  },
  [OPENAPI_SCHEMA_NAMES.sendMessageResponse]: {
    type: 'object',
    required: ['id', 'status', 'timestamp', 'estimatedDelivery', 'cost'],
    properties: {
      id: idSchema,
      status: { type: 'string', enum: ['queued'] },
      timestamp: isoDateTimeSchema,
      estimatedDelivery: isoDateTimeSchema,
      cost: moneyCentsSchema,
      currentBalance: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.messageResponse]: {
    type: 'object',
    required: [
      'id',
      'conversationId',
      'content',
      'senderType',
      'timestamp',
      'priority',
      'status',
      'cost',
    ],
    properties: {
      id: idSchema,
      conversationId: idSchema,
      content: { type: 'string', example: 'Pedido confirmado.' },
      senderType: { type: 'string', enum: [...SENDER_TYPE_VALUES] },
      timestamp: isoDateTimeSchema,
      priority: { type: 'string', enum: [...MESSAGE_PRIORITY_VALUES] },
      status: { type: 'string', enum: [...MESSAGE_STATUS_VALUES] },
      cost: moneyCentsSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.messageStatusResponse]: {
    type: 'object',
    required: ['messageId', 'conversationId', 'status', 'occurredAt'],
    properties: {
      messageId: idSchema,
      conversationId: idSchema,
      status: { type: 'string', enum: [...MESSAGE_STATUS_VALUES] },
      occurredAt: isoDateTimeSchema,
    },
  },
  [OPENAPI_SCHEMA_NAMES.queueStatusResponse]: {
    type: 'object',
    required: ['normalQueued', 'urgentQueued', 'processing', 'processedCount', 'failedCount'],
    properties: {
      normalQueued: { type: 'integer', minimum: 0 },
      urgentQueued: { type: 'integer', minimum: 0 },
      processing: { type: 'boolean' },
      processedCount: { type: 'integer', minimum: 0 },
      failedCount: { type: 'integer', minimum: 0 },
    },
  },
};
