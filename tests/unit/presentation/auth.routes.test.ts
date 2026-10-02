import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';
import { APP_VERSION } from '../../../src/version.js';
import { DEFAULT_TOKEN_TTL_SECONDS } from '../../../src/presentation/plugins/auth.js';
import { TEST_PASSWORD, authHeaders, uniqueEmail } from '../../helpers/auth.js';

describe('Auth API', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;

  beforeEach(async () => {
    app = await buildApp();
    await container.personRepository.clear();
    await container.pointsRepository.clear();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function signUp(overrides: { email?: string; password?: string; name?: string } = {}) {
    return container.createPerson.execute({
      name: overrides.name ?? 'Ada Lovelace',
      role: 'receiver',
      email: overrides.email ?? uniqueEmail('auth'),
      password: overrides.password ?? TEST_PASSWORD,
    });
  }

  describe('POST /auth/login', () => {
    it('returns a bearer token and the signed-in person', async () => {
      const person = await signUp({ email: uniqueEmail('login') });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(DEFAULT_TOKEN_TTL_SECONDS);
      expect(body.token).toEqual(expect.any(String));
      expect(body.person.id).toBe(person.id);
      expect(body.person.email).toBe(person.email);
      expect(body.appVersion).toBe(APP_VERSION);
      expect(body.timestamp).toEqual(expect.any(Number));
    });

    it('never returns the password or its hash', async () => {
      const person = await signUp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });

      const body = response.json();
      expect(body.person.password).toBeUndefined();
      expect(body.person.passwordHash).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(TEST_PASSWORD);
    });

    it('accepts a differently cased email', async () => {
      const person = await signUp({ email: uniqueEmail('case') });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email.toUpperCase(), password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
    });

    it('issues a token carrying the person claims', async () => {
      const person = await signUp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });
      const token = String(response.json().token);

      const claims = app.jwt.verify(token) as {
        sub: string;
        role: string;
        email: string;
        exp: number;
      };
      expect(claims).toMatchObject({ sub: person.id, role: 'receiver', email: person.email });
      expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('rejects a wrong password with 401', async () => {
      const person = await signUp();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: 'wrong-password' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Invalid email or password');
    });

    it('rejects an unknown email with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: uniqueEmail('ghost'), password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects an inactive person with 403', async () => {
      const person = await signUp();
      await container.personRepository.save(person.deactivate());

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain('is not active');
    });

    it('rejects an invalid payload with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'not-an-email', password: '' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });
  });

  describe('token usage', () => {
    it('authorizes protected routes with a freshly issued token', async () => {
      const person = await signUp();
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });
      const { token } = login.json();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/persons',
        headers: authHeaders(token),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().persons).toHaveLength(1);
    });

    it('rejects a tampered token signature', async () => {
      const person = await signUp();
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: person.email, password: TEST_PASSWORD },
      });
      const [header, payload, signature] = String(login.json().token).split('.');
      const tampered = `${header}.${payload}.${signature?.slice(0, -2)}xx`;

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/persons',
        headers: authHeaders(tampered),
      });

      expect(response.statusCode).toBe(401);
    });

    it('keeps the health check public', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/healthCheck' });

      expect(response.statusCode).toBe(200);
    });

    it('keeps the docs public', async () => {
      const response = await app.inject({ method: 'GET', url: '/docs/json' });

      expect(response.statusCode).toBe(200);
    });
  });
});
