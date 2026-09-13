import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server.js';
import { container } from '../../../src/application/di/container.js';

describe('Rewards API', () => {
  let app: ReturnType<typeof buildApp> extends Promise<infer T> ? T : never;

  beforeEach(async () => {
    app = await buildApp();
    await container.rewardRepository.clear();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /rewards', () => {
    it('creates a percentage reward and returns it with 201', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/rewards',
        payload: { name: 'Ten percent', type: 'percentage', value: 10 },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.id).toEqual(expect.any(String));
      expect(body.name).toBe('Ten percent');
      expect(body.type).toBe('percentage');
      expect(body.value).toBe(10);
      expect(body.isActive).toBe(true);
      expect(body.createdAt).toEqual(expect.any(String));
    });

    it('rejects an invalid payload with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/rewards',
        payload: { name: '', type: 'percentage', value: -5 },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('ValidationError');
    });
  });

  describe('GET /rewards', () => {
    it('returns an empty list initially', async () => {
      const response = await app.inject({ method: 'GET', url: '/rewards' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ rewards: [] });
    });

    it('filters to active rewards when active=true', async () => {
      await container.createReward.execute({ name: 'Active', type: 'fixed', value: 5 });
      const reward = await container.createReward.execute({ name: 'Inactive', type: 'fixed', value: 5 });
      const inactive = await container.getReward.execute(reward.id);
      await container.rewardRepository.save(inactive.deactivate());

      const response = await app.inject({ method: 'GET', url: '/rewards?active=true' });

      expect(response.statusCode).toBe(200);
      expect(response.json().rewards).toHaveLength(1);
      expect(response.json().rewards[0].name).toBe('Active');
    });
  });

  describe('GET /rewards/:id', () => {
    it('returns a stored reward', async () => {
      const { id } = await container.createReward.execute({ name: 'Fetch me', type: 'fixed', value: 8 });

      const response = await app.inject({ method: 'GET', url: `/rewards/${id}` });

      expect(response.statusCode).toBe(200);
      expect(response.json().name).toBe('Fetch me');
    });

    it('returns 404 for an unknown id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/rewards/00000000-0000-4000-8000-000000000099',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().message).toContain('was not found');
    });

    it('returns 400 for a malformed id', async () => {
      const response = await app.inject({ method: 'GET', url: '/rewards/not-a-uuid' });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /rewards/:id', () => {
    it('deletes an existing reward with 204', async () => {
      const { id } = await container.createReward.execute({ name: 'Delete me', type: 'fixed', value: 3 });

      const response = await app.inject({ method: 'DELETE', url: `/rewards/${id}` });

      expect(response.statusCode).toBe(204);
      await expect(container.getReward.execute(id)).rejects.toThrow('was not found');
    });

    it('returns 404 when deleting a missing reward', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/rewards/00000000-0000-4000-8000-000000000098',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /rewards/calculate', () => {
    it('calculates points for a percentage reward', async () => {
      const { id } = await container.createReward.execute({ name: 'Calc', type: 'percentage', value: 10 });

      const response = await app.inject({
        method: 'POST',
        url: '/rewards/calculate',
        payload: { rewardId: id, amount: 250 },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ rewardId: id, points: 25 });
    });

    it('returns 404 for an unknown or inactive reward', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/rewards/calculate',
        payload: { rewardId: '00000000-0000-4000-8000-000000000097', amount: 100 },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /health', () => {
    it('reports the service is healthy', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });
});