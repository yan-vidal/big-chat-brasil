import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { OPENAPI_SCHEMAS, schemaRef } from './openapi.schemas.js';

export const OPENAPI_UI_PATH = 'docs';
export const OPENAPI_JSON_PATH = 'docs-json';

type HttpMethod = 'get' | 'post';
type OperationObject = NonNullable<OpenAPIObject['paths'][string][HttpMethod]>;
type RequestBodyObject = NonNullable<OperationObject['requestBody']>;
type ResponseObject = NonNullable<OperationObject['responses'][string]>;
type SchemaObject = NonNullable<NonNullable<OpenAPIObject['components']>['schemas']>[string];
type ReferenceObject = { readonly $ref: string };
type OperationMetadata = Pick<OperationObject, 'summary' | 'tags' | 'responses'> &
  Partial<Pick<OperationObject, 'description' | 'parameters' | 'requestBody' | 'security'>>;

const bearerSecurity = [{ bearer: [] }];

const OPENAPI_OPERATIONS: Record<string, Partial<Record<HttpMethod, OperationMetadata>>> = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Consulta saúde da API',
      responses: {
        200: jsonResponse('API operacional', schemaRef('healthResponse')),
      },
    },
  },
  '/auth/session': {
    post: {
      tags: ['Auth'],
      summary: 'Cria sessão por CPF/CNPJ e senha',
      description: 'Clientes inexistentes são criados automaticamente e seguem para onboarding.',
      requestBody: jsonRequest(schemaRef('authSessionRequest')),
      responses: {
        201: jsonResponse('Sessão criada', schemaRef('authSessionResponse')),
        400: jsonResponse('Documento ou payload inválido', schemaRef('apiError')),
        401: jsonResponse('Credenciais inválidas', schemaRef('apiError')),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Retorna cliente autenticado',
      security: bearerSecurity,
      responses: {
        200: jsonResponse('Cliente autenticado', schemaRef('authenticatedClient')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
      },
    },
  },
  '/billing/onboarding': {
    post: {
      tags: ['Billing'],
      summary: 'Configura plano inicial do cliente',
      security: bearerSecurity,
      requestBody: jsonRequest(schemaRef('onboardingRequest')),
      responses: {
        201: jsonResponse('Onboarding atualizado', schemaRef('onboardingResponse')),
        400: jsonResponse('Payload inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
      },
    },
  },
  '/billing/pix-intents': {
    post: {
      tags: ['Billing'],
      summary: 'Cria intenção de PIX simulado',
      security: bearerSecurity,
      requestBody: jsonRequest(schemaRef('createPixIntentRequest')),
      responses: {
        201: jsonResponse('PIX pendente criado', schemaRef('paymentIntentResponse')),
        400: jsonResponse('Valor inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
      },
    },
  },
  '/billing/pix-intents/{id}/confirm': {
    post: {
      tags: ['Billing'],
      summary: 'Confirma intenção de PIX simulado',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da intenção de PIX')],
      responses: {
        201: jsonResponse('PIX confirmado e saldo atualizado', schemaRef('confirmPixResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        404: jsonResponse('PIX não encontrado', schemaRef('apiError')),
        409: jsonResponse('PIX já confirmado', schemaRef('apiError')),
      },
    },
  },
  '/billing/me': {
    get: {
      tags: ['Billing'],
      summary: 'Consulta saldo, limite e transações do cliente',
      security: bearerSecurity,
      responses: {
        200: jsonResponse('Resumo financeiro', schemaRef('billingSummaryResponse')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
      },
    },
  },
  '/recipients': {
    get: {
      tags: ['Recipients'],
      summary: 'Lista destinatários disponíveis',
      security: bearerSecurity,
      responses: {
        200: jsonArrayResponse('Destinatários disponíveis', schemaRef('recipientResponse')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
      },
    },
  },
  '/conversations': {
    get: {
      tags: ['Conversations'],
      summary: 'Lista conversas do cliente autenticado',
      security: bearerSecurity,
      responses: {
        200: jsonArrayResponse('Conversas do cliente', schemaRef('conversationResponse')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
      },
    },
  },
  '/conversations/{id}': {
    get: {
      tags: ['Conversations'],
      summary: 'Consulta uma conversa',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da conversa')],
      responses: {
        200: jsonResponse('Conversa encontrada', schemaRef('conversationResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
        404: jsonResponse('Conversa não encontrada', schemaRef('apiError')),
      },
    },
  },
  '/conversations/{id}/messages': {
    get: {
      tags: ['Conversations'],
      summary: 'Lista mensagens de uma conversa',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da conversa')],
      responses: {
        200: jsonArrayResponse('Mensagens da conversa', schemaRef('messageResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
        404: jsonResponse('Conversa não encontrada', schemaRef('apiError')),
      },
    },
  },
  '/conversations/{id}/read': {
    post: {
      tags: ['Conversations'],
      summary: 'Marca conversa como lida',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da conversa')],
      responses: {
        201: jsonResponse('Conversa marcada como lida', schemaRef('markConversationReadResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
        404: jsonResponse('Conversa não encontrada', schemaRef('apiError')),
      },
    },
  },
  '/messages': {
    post: {
      tags: ['Messages'],
      summary: 'Envia mensagem normal ou urgente',
      security: bearerSecurity,
      requestBody: jsonRequest(schemaRef('sendMessageRequest')),
      responses: {
        201: jsonResponse('Mensagem enfileirada', schemaRef('sendMessageResponse')),
        400: jsonResponse('Payload inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        402: jsonResponse('Saldo ou limite insuficiente', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
      },
    },
  },
  '/messages/{id}': {
    get: {
      tags: ['Messages'],
      summary: 'Consulta uma mensagem',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da mensagem')],
      responses: {
        200: jsonResponse('Mensagem encontrada', schemaRef('messageResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
        404: jsonResponse('Mensagem não encontrada', schemaRef('apiError')),
      },
    },
  },
  '/messages/{id}/status': {
    get: {
      tags: ['Messages'],
      summary: 'Consulta status atual de uma mensagem',
      security: bearerSecurity,
      parameters: [pathIdParameter('id', 'ID da mensagem')],
      responses: {
        200: jsonResponse('Status da mensagem', schemaRef('messageStatusResponse')),
        400: jsonResponse('ID inválido', schemaRef('apiError')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Onboarding pendente', schemaRef('apiError')),
        404: jsonResponse('Mensagem não encontrada', schemaRef('apiError')),
      },
    },
  },
  '/queue/status': {
    get: {
      tags: ['Queue'],
      summary: 'Consulta estado da fila de mensagens',
      description: 'Endpoint administrativo.',
      security: bearerSecurity,
      responses: {
        200: jsonResponse('Estado atual da fila', schemaRef('queueStatusResponse')),
        401: jsonResponse('Sessão inválida', schemaRef('apiError')),
        403: jsonResponse('Acesso restrito a administradores', schemaRef('apiError')),
      },
    },
  },
};

export function setupOpenApi(app: INestApplication): void {
  SwaggerModule.setup(OPENAPI_UI_PATH, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
    customSiteTitle: 'Big Chat Brasil API Docs',
  });
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Big Chat Brasil API')
    .setDescription(
      'API REST do desafio Big Chat Brasil: auth, billing, conversas, mensagens e fila.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .addTag('Health')
    .addTag('Auth')
    .addTag('Billing')
    .addTag('Recipients')
    .addTag('Conversations')
    .addTag('Messages')
    .addTag('Queue')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });

  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ...OPENAPI_SCHEMAS,
    },
  };
  applyOperationMetadata(document);

  return document;
}

function applyOperationMetadata(document: OpenAPIObject): void {
  for (const [path, methods] of Object.entries(OPENAPI_OPERATIONS)) {
    const pathItem = document.paths[path];

    if (!pathItem) {
      throw new Error(`OpenAPI route metadata targets missing path: ${path}`);
    }

    for (const [method, metadata] of Object.entries(methods)) {
      const operation = pathItem[method as HttpMethod];

      if (!operation) {
        throw new Error(
          `OpenAPI route metadata targets missing operation: ${method.toUpperCase()} ${path}`,
        );
      }

      pathItem[method as HttpMethod] = {
        ...operation,
        ...metadata,
      };
    }
  }
}

function jsonRequest(schema: SchemaObject | ReferenceObject): RequestBodyObject {
  return {
    required: true,
    content: {
      'application/json': { schema },
    },
  };
}

function jsonResponse(description: string, schema: SchemaObject | ReferenceObject): ResponseObject {
  return {
    description,
    content: {
      'application/json': { schema },
    },
  };
}

function jsonArrayResponse(
  description: string,
  itemSchema: SchemaObject | ReferenceObject,
): ResponseObject {
  return jsonResponse(description, { type: 'array', items: itemSchema });
}

function pathIdParameter(name: string, description: string) {
  return {
    name,
    in: 'path' as const,
    required: true,
    description,
    schema: { type: 'string', format: 'uuid' },
  };
}
