import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';

function buildWebAssets(): void {
  execSync('npm run build:web', {
    cwd: new URL('../../../', import.meta.url),
    stdio: 'pipe',
  });
}

describe('Static frontend', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;

  beforeAll(() => {
    buildWebAssets();
  });

  beforeEach(async () => {
    app = await buildApp();
    await container.personRepository.clear();
    await container.pointsRepository.clear();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the homepage at /', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.headers['cache-control']).toBe('no-cache');
    const body = response.payload;
    expect(body).toContain('<title>Members \u2014 rewards</title>');
    expect(body).toContain('id="cards"');
  });

  it('serves the compiled stylesheet', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/tailwind.css' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/css');
  });

  it('serves the bundled script', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/main.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
  });

  it('keeps the API routes mounted under /api/v1', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });

    expect(response.statusCode).toBe(200);
  });
});