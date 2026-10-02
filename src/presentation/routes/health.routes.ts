import { FastifyInstance } from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { healthCheckResponseSchema } from '../schemas/health.schemas.js';

interface HealthRouteOptions {
  appVersion: string;
}

export function buildHealthRoutes(app: FastifyInstance, options: HealthRouteOptions): void {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/healthCheck',
    {
      schema: {
        tags: ['health'],
        description: 'Liveness and version check',
        security: [],
        response: {
          200: healthCheckResponseSchema,
        },
      },
    },
    async () => ({
      status: 'OK' as const,
      appVersion: options.appVersion,
      timestamp: Date.now(),
    }),
  );
}