import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';
import { APP_VERSION } from '../../../src/version.js';

describe('Persons API', () => {
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

  describe('POST /persons', () => {
    it('creates a person and returns it with 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/persons',
        payload: {
          name: 'Ada Lovelace',
          role: 'provider',
          email: 'ada@example.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.name).toBe('Ada Lovelace');
      expect(body.role).toBe('provider');
      expect(body.email).toBe('ada@example.com');
      expect(body.isActive).toBe(true);
      expect(body.pointsBalance).toBe(0);
      expect(body.appVersion).toBe(APP_VERSION);
      expect(body.timestamp).toEqual(expect.any(Number));
    });

    it('creates a person without an email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/persons',
        payload: { name: 'Grace Hopper', role: 'receiver' },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().email).toBeUndefined();
    });

    it('rejects a missing role with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/persons',
        payload: { name: 'Grace Hopper' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });

    it('rejects an invalid payload with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/persons',
        payload: { name: '', role: 'admin', email: 'not-an-email' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });
  });

  describe('GET /persons', () => {
    it('returns an empty list initially', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/persons' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(expect.objectContaining({ persons: [] }));
    });

    it('returns created persons', async () => {
      await container.createPerson.execute({ name: 'Ada Lovelace', role: 'receiver' });
      await container.createPerson.execute({ name: 'Grace Hopper', role: 'provider' });

      const response = await app.inject({ method: 'GET', url: '/api/v1/persons' });

      expect(response.statusCode).toBe(200);
      expect(response.json().persons).toHaveLength(2);
    });
  });

  describe('GET /persons/:id', () => {
    it('returns a stored person', async () => {
      const person = await container.createPerson.execute({ name: 'Ada', role: 'receiver' });

      const response = await app.inject({ method: 'GET', url: `/api/v1/persons/${person.id}` });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe('Ada');
      expect(response.json().role).toBe('receiver');
    });

    it('returns 404 for an unknown id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/persons/00000000-0000-4000-8000-000000000099',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toContain('was not found');
    });

    it('returns 400 for a malformed id', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/persons/not-a-uuid' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /persons/:id', () => {
    it('updates an existing person', async () => {
      const person = await container.createPerson.execute({
        name: 'Ada',
        role: 'receiver',
        email: 'ada@example.com',
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/persons/${person.id}`,
        payload: { name: 'Ada G.', role: 'provider', email: 'ada.g@example.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('Ada G.');
      expect(body.role).toBe('provider');
      expect(body.email).toBe('ada.g@example.com');
    });

    it('keeps the role when updating without one', async () => {
      const person = await container.createPerson.execute({ name: 'Ada', role: 'provider' });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/persons/${person.id}`,
        payload: { name: 'Ada G.' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().role).toBe('provider');
    });

    it('returns 404 for an unknown id', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/persons/00000000-0000-4000-8000-000000000098',
        payload: { name: 'Nobody', role: 'receiver' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /persons/:id', () => {
    it('deletes an existing person with 204', async () => {
      const person = await container.createPerson.execute({ name: 'Ada', role: 'receiver' });

      const response = await app.inject({ method: 'DELETE', url: `/api/v1/persons/${person.id}` });

      expect(response.statusCode).toBe(204);
      await expect(container.getPerson.execute(person.id)).rejects.toThrow('was not found');
    });

    it('returns 404 when deleting a missing person', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/persons/00000000-0000-4000-8000-000000000097',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});