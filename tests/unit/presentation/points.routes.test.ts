import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';
import { APP_VERSION } from '../../../src/version.js';

describe('Points API', () => {
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

  describe('POST /points/add', () => {
    it('adds points and returns the new balance', async () => {
      const person = await container.createPerson.execute({ name: 'Ada' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        payload: { personId: person.id, points: 150, reason: 'Welcome bonus' },
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
      const person = await container.createPerson.execute({ name: 'Ada' });

      await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        payload: { personId: person.id, points: 100 },
      });

      const [entry] = await container.pointsRepository.findByPersonId(person.id);
      expect(entry?.type).toBe('earned');
      expect(entry?.balanceAfter).toBe(100);
      expect((await container.getPerson.execute(person.id)).pointsBalance).toBe(100);
    });

    it('returns 404 for an unknown person', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        payload: { personId: '00000000-0000-4000-8000-000000000099', points: 10 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid points', async () => {
      const person = await container.createPerson.execute({ name: 'Ada' });
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/add',
        payload: { personId: person.id, points: 0 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /points/remove', () => {
    it('removes points and returns the new balance', async () => {
      const person = await container.createPerson.execute({ name: 'Ada' });
      await container.addPoints.execute({ personId: person.id, points: 100 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/remove',
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
      const person = await container.createPerson.execute({ name: 'Ada' });
      await container.addPoints.execute({ personId: person.id, points: 5 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/remove',
        payload: { personId: person.id, points: 6 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });
  });

  describe('POST /points/redeem', () => {
    it('redeems points and returns the new balance', async () => {
      const person = await container.createPerson.execute({ name: 'Ada' });
      await container.addPoints.execute({ personId: person.id, points: 200 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/redeem',
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
      const person = await container.createPerson.execute({ name: 'Ada' });
      await container.addPoints.execute({ personId: person.id, points: 10 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/points/redeem',
        payload: { personId: person.id, points: 11 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  it('reflects point operations on the person record', async () => {
    const person = await container.createPerson.execute({ name: 'Ada' });
    await container.addPoints.execute({ personId: person.id, points: 100 });
    await container.removePoints.execute({ personId: person.id, points: 30 });

    const response = await app.inject({ method: 'GET', url: `/api/v1/persons/${person.id}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().pointsBalance).toBe(70);
  });
});