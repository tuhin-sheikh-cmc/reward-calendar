import { FastifyInstance } from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { Container } from '../../application/di/container.js';
import { ForbiddenError } from '../../domain/errors/domain-error.js';
import { withAppMeta } from '../helpers/app-meta.js';
import { toPointsEntryResponse } from '../mappers/points-entry.mapper.js';
import { requireProvider } from '../plugins/auth.js';
import { personParamsSchema } from '../schemas/person.schemas.js';
import { errorResponseSchema } from '../schemas/reward.schemas.js';
import {
  listPointsEntriesQuerySchema,
  listPointsEntriesResponseSchema,
  pointsAdjustmentRequestSchema,
  pointsAdjustmentResponseSchema,
} from '../schemas/points.schemas.js';

const DEFAULT_ENTRIES_LIMIT = 100;

interface PointsRouteOptions {
  container: Container;
}

export function buildPointsRoutes(app: FastifyInstance, options: PointsRouteOptions): void {
  const { container } = options;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/persons/:id/points',
    {
      schema: {
        tags: ['points'],
        description: 'List the most recent points ledger entries for a person. Providers may view anyone, receivers only themselves',
        params: personParamsSchema,
        querystring: listPointsEntriesQuerySchema,
        response: {
          200: listPointsEntriesResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const personId = request.params.id;
      if (request.user.role !== 'provider' && request.user.sub !== personId) {
        throw new ForbiddenError('A receiver can only view their own points');
      }
      const result = await container.listPointsEntries.execute({
        personId,
        limit: request.query.limit ?? DEFAULT_ENTRIES_LIMIT,
        offset: request.query.offset ?? 0,
      });
      return reply.status(200).send(
        withAppMeta({
          personId: result.personId,
          entries: result.entries.map(toPointsEntryResponse),
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        }),
      );
    },
  );

  typedApp.post(
    '/points/add',
    {
      preHandler: requireProvider,
      schema: {
        tags: ['points'],
        description: 'Grant loyalty points to a person. The authenticated provider is the grantor, and a provider cannot grant points to themselves',
        body: pointsAdjustmentRequestSchema,
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
        providerId: request.user.sub,
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
      preHandler: requireProvider,
      schema: {
        tags: ['points'],
        description: 'Remove loyalty points from a person. Only a provider can remove points',
        body: pointsAdjustmentRequestSchema,
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