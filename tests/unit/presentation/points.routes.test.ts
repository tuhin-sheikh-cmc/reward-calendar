import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';
import { APP_VERSION } from '../../../src/version.js';
import { TEST_PASSWORD, tokenHeaders, uniqueEmail } from '../../helpers/auth.js';

describe('Points API', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;
  let auth: Record<string, string>;

  beforeEach(async () => {
    app = await buildApp();
    await container.personRepository.clear();
    await container.pointsRepository.clear();
    auth = tokenHeaders(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function createProvider(): Promise<{ id: string }> {
    return container.createPerson.execute({
      name: 'Boss',
      role: 'provider',
      email: uniqueEmail('provider'),
      password: TEST_PASSWORD,
    });
  }

  async function createReceiver(): Promise<{ id: string }> {
    return container.createPerson.execute({
      name: 'Ada',
      role: 'receiver',
      email: uniqueEmail('receiver'),
      password: TEST_PASSWORD,
    });
  }

  describe('POST /points/add', () => {
    it('adds points and returns the new balance', async () => {
      const provider = await createProvider();
      const person = await createReceiver();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: {
          personId: person.id,
          points: 150,
          reason: 'Welcome bonus',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          personId: person.id,
          type: 'earned',
          points: 150,
          balance: 150,
        }),
      );
      expect(response.json().appVersion).toBe(APP_VERSION);
      expect(response.json().timestamp).toEqual(expect.any(Number));
    });

    it('records the ledger entry and updates the person', async () => {
      const provider = await createProvider();
      const person = await createReceiver();

      await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { personId: person.id, points: 100 },
      });

      const [entry] = await container.pointsRepository.findByPersonId(person.id);
      expect(entry?.type).toBe('earned');
      expect(entry?.balanceAfter).toBe(100);
      expect((await container.getPerson.execute(person.id)).pointsBalance).toBe(100);
    });

    it('returns 404 for an unknown receiver', async () => {
      const provider = await createProvider();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: {
          personId: '00000000-0000-4000-8000-000000000099',
          points: 10,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 when the authenticated provider no longer exists', async () => {
      const person = await createReceiver();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, {
          sub: '00000000-0000-4000-8000-000000000098',
          role: 'provider',
        }),
        payload: {
          personId: person.id,
          points: 10,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 403 when granting points to oneself', async () => {
      const provider = await createProvider();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { personId: provider.id, points: 10 },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain('cannot grant points to themselves');
    });

    it('returns 403 when a receiver tries to grant points', async () => {
      const receiver = await createReceiver();
      const person = await createReceiver();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: receiver.id, role: 'receiver' }),
        payload: { personId: person.id, points: 10 },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain('Only providers');
    });

    it('ignores any providerId sent in the body', async () => {
      const provider = await createProvider();
      const otherProvider = await createProvider();
      const person = await createReceiver();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { providerId: otherProvider.id, personId: person.id, points: 10 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 400 for invalid points', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { personId: person.id, points: 0 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /points/remove', () => {
    it('removes points and returns the new balance', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 100 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/remove',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { personId: person.id, points: 25 },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          personId: person.id,
          type: 'removed',
          points: 25,
          balance: 75,
        }),
      );
    });

    it('returns 400 when removing more than the balance', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 5 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/remove',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
        payload: { personId: person.id, points: 6 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });

    it('returns 403 when a receiver tries to remove points', async () => {
      const receiver = await createReceiver();
      const person = await createReceiver();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/remove',
        headers: tokenHeaders(app, { sub: receiver.id, role: 'receiver' }),
        payload: { personId: person.id, points: 5 },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain('Only providers');
    });
  });

  describe('POST /points/redeem', () => {
    it('redeems points and returns the new balance', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 200 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/redeem',
        headers: auth,
        payload: { personId: person.id, points: 80, reason: 'Reward code' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(
        expect.objectContaining({
          personId: person.id,
          type: 'redeemed',
          points: 80,
          balance: 120,
        }),
      );

      const entries = await container.pointsRepository.findByPersonId(person.id);
      expect(entries).toHaveLength(2);
      expect(entries[1]?.type).toBe('redeemed');
      expect(entries[1]?.reason).toBe('Reward code');
    });

    it('returns 400 when redeeming more than the balance', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 10 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/redeem',
        headers: auth,
        payload: { personId: person.id, points: 11 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /persons/:id/points', () => {
    it('returns the latest entries first for a provider viewing anyone', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 10 });
      await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 20 });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/persons/${person.id}/points`,
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.total).toBe(2);
      expect(body.hasMore).toBe(false);
      expect(body.limit).toBe(100);
      expect(body.entries).toHaveLength(2);
      expect(body.entries[0].points).toBe(20);
      expect(body.entries[1].points).toBe(10);
      expect(body.appVersion).toBe(APP_VERSION);
    });

    it('lets a receiver view their own points', async () => {
      const provider = await createProvider();
      const receiver = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: receiver.id, points: 15 });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/persons/${receiver.id}/points`,
        headers: tokenHeaders(app, { sub: receiver.id, role: 'receiver' }),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().entries[0].points).toBe(15);
    });

    it('forbids a receiver from viewing another person\u2019s points', async () => {
      const provider = await createProvider();
      const receiver = await createReceiver();
      const other = await createReceiver();
      await container.addPoints.execute({ providerId: provider.id, personId: other.id, points: 5 });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/persons/${other.id}/points`,
        headers: tokenHeaders(app, { sub: receiver.id, role: 'receiver' }),
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().message).toContain('own points');
    });

    it('paginates with limit and offset', async () => {
      const provider = await createProvider();
      const person = await createReceiver();
      for (let points = 1; points <= 3; points += 1) {
        await container.addPoints.execute({ providerId: provider.id, personId: person.id, points });
      }

      const first = await app.inject({
        method: 'GET',
        url: `/api/v1/persons/${person.id}/points?limit=2&offset=0`,
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
      });
      expect(first.statusCode).toBe(200);
      expect(first.json().entries).toHaveLength(2);
      expect(first.json().hasMore).toBe(true);
      expect(first.json().total).toBe(3);
      expect(first.json().limit).toBe(2);

      const second = await app.inject({
        method: 'GET',
        url: `/api/v1/persons/${person.id}/points?limit=2&offset=2`,
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
      });
      expect(second.json().entries).toHaveLength(1);
      expect(second.json().hasMore).toBe(false);
    });

    it('returns 404 for an unknown person', async () => {
      const provider = await createProvider();
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/persons/00000000-0000-4000-8000-000000000097/points',
        headers: tokenHeaders(app, { sub: provider.id, role: 'provider' }),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  it('reflects point operations on the person record', async () => {
    const provider = await createProvider();
    const person = await createReceiver();
    await container.addPoints.execute({ providerId: provider.id, personId: person.id, points: 100 });
    await container.removePoints.execute({ personId: person.id, points: 30 });

    const response = await app.inject({ method: 'GET', url: `/api/v1/persons/${person.id}`, headers: auth });

    expect(response.statusCode).toBe(200);
    expect(response.json().pointsBalance).toBe(70);
  });
});