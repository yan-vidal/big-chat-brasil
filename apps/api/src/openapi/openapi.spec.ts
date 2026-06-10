import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module.js';
import { createOpenApiDocument } from './openapi.js';

describe('OpenAPI documentation', () => {
  it('generates a documented contract for the public HTTP API', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();

    try {
      const document = createOpenApiDocument(app);

      expect(document.info).toMatchObject({
        title: 'Big Chat Brasil API',
        version: '0.1.0',
      });
      expect(document.components?.securitySchemes?.bearer).toMatchObject({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
      expect(Object.keys(document.paths).sort()).toEqual([
        '/admin/clients',
        '/admin/clients/{id}/credits',
        '/admin/clients/{id}/limit',
        '/admin/clients/{id}/plan',
        '/admin/clients/{id}/status',
        '/auth/me',
        '/auth/session',
        '/billing/me',
        '/billing/onboarding',
        '/billing/pix-intents',
        '/billing/pix-intents/{id}/confirm',
        '/conversations',
        '/conversations/{id}',
        '/conversations/{id}/messages',
        '/conversations/{id}/read',
        '/health',
        '/messages',
        '/messages/{id}',
        '/messages/{id}/status',
        '/queue/status',
        '/recipients',
      ]);
      expect(document.paths).toHaveProperty('/auth/session');
      expect(document.paths).toHaveProperty('/billing/me');
      expect(document.paths).toHaveProperty('/admin/clients');
      expect(document.paths).toHaveProperty('/messages');
      expect(document.paths).toHaveProperty('/queue/status');
      expect(document.paths['/auth/session']?.post?.requestBody).toBeDefined();
      expect(document.paths['/admin/clients']?.get?.security).toEqual([{ bearer: [] }]);
      expect(document.paths['/admin/clients']?.post?.security).toEqual([{ bearer: [] }]);
      expect(document.paths['/messages']?.post?.security).toEqual([{ bearer: [] }]);
      expect(document.paths['/queue/status']?.get?.security).toEqual([{ bearer: [] }]);
      expect(document.components?.schemas).toEqual(
        expect.objectContaining({
          AuthSessionRequest: expect.any(Object),
          AuthSessionResponse: expect.any(Object),
          AdminClientResponse: expect.any(Object),
          AdminCreateClientRequest: expect.any(Object),
          AdminConvertPlanRequest: expect.any(Object),
          OnboardingRequest: expect.any(Object),
          BillingSummaryResponse: expect.any(Object),
          SendMessageRequest: expect.any(Object),
          MessageResponse: expect.any(Object),
          QueueStatusResponse: expect.any(Object),
        }),
      );

      for (const pathItem of Object.values(document.paths)) {
        for (const operation of Object.values(pathItem)) {
          if (!operation || typeof operation !== 'object' || !('responses' in operation)) {
            continue;
          }

          expect(operation.summary).toEqual(expect.any(String));
          expect(operation.tags).toEqual(expect.arrayContaining([expect.any(String)]));
          expect(Object.keys(operation.responses)).not.toHaveLength(0);
        }
      }
    } finally {
      await app.close();
    }
  });
});
