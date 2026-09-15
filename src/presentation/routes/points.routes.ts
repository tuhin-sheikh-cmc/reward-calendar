import { FastifyInstance } from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { Container } from '../../application/di/container.js';
import { withAppMeta } from '../helpers/app-meta.js';
import { errorResponseSchema } from '../schemas/reward.schemas.js';
import {
  grantPointsRequestSchema,
  pointsAdjustmentRequestSchema,
  pointsAdjustmentResponseSchema,
} from '../schemas/points.schemas.js';

interface PointsRouteOptions {
  container: Container;
}

export function buildPointsRoutes(app: FastifyInstance, options: PointsRouteOptions): void {
  const { container } = options;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    '/points/add',
    {
      schema: {
        tags: ['points'],
        description: 'Grant loyalty points to a person. Only an active provider can grant points, and never to themselves',
        body: grantPointsRequestSchema,
        response: {
          200: pointsAdjustmentResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const result = await container.addPoints.execute({
        providerId: body.providerId,
        personId: body.personId,
        points: body.points,
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
      });
      return reply.status(200).send(withAppMeta(result));
    },
  );

  typedApp.post(
    '/points/remove',
    {
      schema: {
        tags: ['points'],
        description: 'Remove loyalty points from a person',
        body: pointsAdjustmentRequestSchema,
        response: {
          200: pointsAdjustmentResponseSchema,
          404: errorResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const result = await container.removePoints.execute({
        personId: body.personId,
        points: body.points,
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
      });
      return reply.status(200).send(withAppMeta(result));
    },
  );

  typedApp.post(
    '/points/redeem',
    {
      schema: {
        tags: ['points'],
        description: 'Redeem a person\u2019s loyalty points',
        body: pointsAdjustmentRequestSchema,
        response: {
          200: pointsAdjustmentResponseSchema,
          404: errorResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const result = await container.redeemPoints.execute({
        personId: body.personId,
        points: body.points,
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
      });
      return reply.status(200).send(withAppMeta(result));
    },
  );
}