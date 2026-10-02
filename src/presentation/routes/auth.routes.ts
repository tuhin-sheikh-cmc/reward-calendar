import { FastifyInstance } from 'fastify';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { Container } from '../../application/di/container.js';
import { withAppMeta } from '../helpers/app-meta.js';
import { toPersonResponse } from '../mappers/person.mapper.js';
import { signToken, getTokenTtlSeconds } from '../plugins/auth.js';
import { loginRequestSchema, loginResponseSchema } from '../schemas/auth.schemas.js';
import { errorResponseSchema } from '../schemas/reward.schemas.js';

interface AuthRouteOptions {
  container: Container;
}

export function buildAuthRoutes(app: FastifyInstance, options: AuthRouteOptions): void {
  const { container } = options;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        description: 'Exchange email and password for a bearer token',
        security: [],
        body: loginRequestSchema,
        response: {
          200: loginResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const person = await container.loginPerson.execute({
        email: request.body.email,
        password: request.body.password,
      });
      const token = signToken(app, {
        sub: person.id,
        role: person.role,
        email: person.email,
      });
      return reply.status(200).send(
        withAppMeta({
          token,
          tokenType: 'Bearer' as const,
          expiresIn: getTokenTtlSeconds(),
          person: toPersonResponse(person),
        }),
      );
    },
  );
}
