import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../../src/server.js';
import { tokenHeaders } from '../../helpers/auth.js';

const ALLOWED_ORIGIN = 'http://localhost:13003';

async function appWithCorsOrigin(corsOrigin?: string) {
  if (corsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = corsOrigin;
  }
  const app = await buildApp();
  await app.ready();
  return app;
}

describe('CORS', () => {
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  it('defaults to the standalone docs UI origin when CORS_ORIGIN is unset', async () => {
    const app = await appWithCorsOrigin();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/healthCheck',
      headers: { origin: ALLOWED_ORIGIN },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    await app.close();
  });

  it('echoes an origin listed in CORS_ORIGIN', async () => {
    const app = await appWithCorsOrigin(`https://docs.example.com, ${ALLOWED_ORIGIN}`);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/persons',
      headers: { origin: 'https://docs.example.com', ...tokenHeaders(app) },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://docs.example.com');
    await app.close();
  });

  it('does not allow an origin missing from CORS_ORIGIN', async () => {
    const app = await appWithCorsOrigin(ALLOWED_ORIGIN);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/persons',
      headers: { origin: 'https://evil.example.com', ...tokenHeaders(app) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });

  it('answers a preflight request from an allowed origin', async () => {
    const app = await appWithCorsOrigin(ALLOWED_ORIGIN);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/persons',
      headers: {
        origin: ALLOWED_ORIGIN,
        'access-control-request-method': 'POST',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    await app.close();
  });

  it('reflects any origin when CORS_ORIGIN contains a wildcard', async () => {
    const app = await appWithCorsOrigin('*');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/persons',
      headers: { origin: 'https://any.example.com', ...tokenHeaders(app) },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://any.example.com');
    await app.close();
  });

  it('omits CORS headers for same-origin requests without an Origin header', async () => {
    const app = await appWithCorsOrigin(ALLOWED_ORIGIN);

    const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });
});
