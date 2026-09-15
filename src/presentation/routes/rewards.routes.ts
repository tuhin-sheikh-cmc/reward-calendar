import { FastifyInstance } from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { Container } from '../../application/di/container.js';
import { withAppMeta } from '../helpers/app-meta.js';
import { toRewardResponse } from '../mappers/reward.mapper.js';
import {
  calculatePointsRequestSchema,
  calculatePointsResponseSchema,
  createRewardRequestSchema,
  deleteRewardResponseSchema,
  errorResponseSchema,
  listRewardsResponseSchema,
  rewardParamsSchema,
  rewardResponseSchema,
  rewardSearchParamsSchema,
} from '../schemas/reward.schemas.js';

interface RewardsRouteOptions {
  container: Container;
}

export function buildRewardsRoutes(app: FastifyInstance, options: RewardsRouteOptions): void {
  const { container } = options;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/rewards',
    {
      schema: {
        tags: ['rewards'],
        description: 'List all rewards, optionally filtered to active ones',
        querystring: rewardSearchParamsSchema,
        response: {
          200: listRewardsResponseSchema,
        },
      },
    },
    async (request) => {
      const active = request.query.active === 'true';
      const rewards = await container.listRewards.execute(active);
      return withAppMeta({ rewards: rewards.map(toRewardResponse) });
    },
  );

  typedApp.get(
    '/rewards/:id',
    {
      schema: {
        tags: ['rewards'],
        description: 'Get a single reward by id',
        params: rewardParamsSchema,
        response: {
          200: rewardResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const reward = await container.getReward.execute(request.params.id);
      return reply.status(200).send(withAppMeta(toRewardResponse(reward)));
    },
  );

  typedApp.post(
    '/rewards',
    {
      schema: {
        tags: ['rewards'],
        description: 'Create a new reward',
        body: createRewardRequestSchema,
        response: {
          201: rewardResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const reward = await container.createReward.execute(request.body);
      return reply.status(201).send(withAppMeta(toRewardResponse(reward)));
    },
  );

  typedApp.delete(
    '/rewards/:id',
    {
      schema: {
        tags: ['rewards'],
        description: 'Delete a reward by id',
        params: rewardParamsSchema,
        response: {
          204: deleteRewardResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await container.removeReward.execute(request.params.id);
      return reply.status(204).send(null);
    },
  );

  typedApp.post(
    '/rewards/calculate',
    {
      schema: {
        tags: ['rewards'],
        description: 'Calculate loyalty points earned for a purchase amount',
        body: calculatePointsRequestSchema,
        response: {
          200: calculatePointsResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await container.calculatePoints.execute(request.body);
      return reply.status(200).send(withAppMeta(result));
    },
  );
}