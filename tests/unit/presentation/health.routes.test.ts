import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';
import { APP_VERSION } from '../../../src/version.js';

describe('Health API', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/healthCheck', () => {
    it('reports status OK, app version and a numeric timestamp', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('OK');
      expect(body.appVersion).toBe(APP_VERSION);
      expect(body.timestamp).toEqual(expect.any(Number));
      expect(body.timestamp).toBeGreaterThan(0);
    });

    it('uses the configured app version when provided', async () => {
      const versionedApp = await buildApp({ appVersion: '2.3.4' });
      const response = await versionedApp.inject({ method: 'GET', url: '/api/v1/healthCheck' });

      expect(response.statusCode).toBe(200);
      expect(response.json().appVersion).toBe('2.3.4');
      await versionedApp.close();
    });
  });
});