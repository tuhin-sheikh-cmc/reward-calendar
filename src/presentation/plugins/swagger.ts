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
      tags: [
        { name: 'rewards', description: 'Reward configuration and points calculation' },
        { name: 'health', description: 'Health and version checks' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}