import Fastify from 'fastify';
import { container } from './application/di/container.js';
import { registerErrorHandler } from './presentation/plugins/error-handler.js';
import { registerOpenApi } from './presentation/plugins/swagger.js';
import { buildHealthRoutes } from './presentation/routes/health.routes.js';
import { buildRewardsRoutes } from './presentation/routes/rewards.routes.js';

export interface AppOptions {
  logger?: boolean;
  openApiVersion?: string;
  appVersion?: string;
}

export async function buildApp(options: AppOptions = {}): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: options.logger ?? false,
    exposeHeadRoutes: false,
  });

  registerErrorHandler(app);
  await registerOpenApi(app, options.openApiVersion);

  await app.register(
    async (instance) => buildRewardsRoutes(instance, { container }),
    {},
  );

  await app.register(
    async (instance) => buildHealthRoutes(instance, { appVersion: options.appVersion ?? '1.0.0' }),
    { prefix: '/api/v1' },
  );

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}