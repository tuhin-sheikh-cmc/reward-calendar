import Fastify from 'fastify';
import { container } from './application/di/container.js';
import { registerErrorHandler } from './presentation/plugins/error-handler.js';
import { registerOpenApi } from './presentation/plugins/swagger.js';
import { buildHealthRoutes } from './presentation/routes/health.routes.js';
import { buildPersonsRoutes } from './presentation/routes/persons.routes.js';
import { buildPointsRoutes } from './presentation/routes/points.routes.js';
import { buildRewardsRoutes } from './presentation/routes/rewards.routes.js';
import { APP_VERSION } from './version.js';

export interface AppOptions {
  logger?: boolean;
  openApiVersion?: string;
  appVersion?: string;
}

export const API_PREFIX = '/api/v1';

export async function buildApp(options: AppOptions = {}): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: options.logger ?? false,
    exposeHeadRoutes: false,
  });

  registerErrorHandler(app);
  await registerOpenApi(app, options.openApiVersion);

  await app.register(
    async (instance) => buildRewardsRoutes(instance, { container }),
    { prefix: API_PREFIX },
  );

  await app.register(
    async (instance) => buildPersonsRoutes(instance, { container }),
    { prefix: API_PREFIX },
  );

  await app.register(
    async (instance) => buildPointsRoutes(instance, { container }),
    { prefix: API_PREFIX },
  );

  await app.register(
    async (instance) => buildHealthRoutes(instance, { appVersion: options.appVersion ?? APP_VERSION }),
    { prefix: API_PREFIX },
  );

  return app;
}