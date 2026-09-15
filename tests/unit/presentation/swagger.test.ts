import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';

describe('OpenAPI docs', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;

  beforeEach(async () => {
    app = await buildApp();
    await container.rewardRepository.clear();
    await container.personRepository.clear();
    await container.pointsRepository.clear();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the swagger UI at GET /docs', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });

  it('generates a valid OpenAPI spec at GET /docs/json', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' });

    expect(response.statusCode).toBe(200);
    const spec = response.json();
    expect(spec.openapi).toEqual(expect.any(String));
    expect(spec.paths).toEqual(
      expect.objectContaining({
        '/api/v1/healthCheck': expect.any(Object),
        '/api/v1/rewards': expect.any(Object),
        '/api/v1/persons': expect.any(Object),
        '/api/v1/points/add': expect.any(Object),
      }),
    );
  });
});