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
    expect(body).toContain('<title>Members \u2014 Puroshkar</title>');
    expect(body).toContain('id="cards"');
  });

  it('serves the provider points page at /points.html', async () => {
    const response = await app.inject({ method: 'GET', url: '/points.html' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    const body = response.payload;
    expect(body).toContain('<title>Manage points \u2014 Puroshkar</title>');
    expect(body).toContain('id="points-form"');
    expect(body).toContain('id="nav-points"');
  });

  it('serves the points breakdown page at /person.html', async () => {
    const response = await app.inject({ method: 'GET', url: '/person.html' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    const body = response.payload;
    expect(body).toContain('<title>Points history \u2014 Puroshkar</title>');
    expect(body).toContain('id="entries"');
    expect(body).toContain('id="load-more"');
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

  it('serves the provider points bundle', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/points.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
  });

  it('serves the points breakdown bundle', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/person.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('javascript');
  });

  it('keeps the API routes mounted under /api/v1', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });

    expect(response.statusCode).toBe(200);
  });
});