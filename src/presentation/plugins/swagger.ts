import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export async function registerOpenApi(app: FastifyInstance, version = '1.0.0'): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Rewards API',
        description: 'API-first rewards service built with TypeScript, Fastify and SOLID principles',
        version,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'auth', description: 'Sign in and bearer token issuance' },
        { name: 'rewards', description: 'Reward configuration and points calculation' },
        { name: 'persons', description: 'Loyalty program members' },
        { name: 'points', description: 'Points ledger operations' },
        { name: 'health', description: 'Health and version checks' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}