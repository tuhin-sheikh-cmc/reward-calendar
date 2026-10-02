import { FastifyInstance } from 'fastify';
import {
  ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { Container } from '../../application/di/container.js';
import { withAppMeta } from '../helpers/app-meta.js';
import { toPersonResponse } from '../mappers/person.mapper.js';
import { errorResponseSchema } from '../schemas/reward.schemas.js';
import {
  createPersonRequestSchema,
  deletePersonResponseSchema,
  listPersonsResponseSchema,
  personParamsSchema,
  personResponseSchema,
  updatePersonRequestSchema,
} from '../schemas/person.schemas.js';

interface PersonsRouteOptions {
  container: Container;
}

export function buildPersonsRoutes(app: FastifyInstance, options: PersonsRouteOptions): void {
  const { container } = options;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    '/persons',
    {
      schema: {
        tags: ['persons'],
        description: 'List all persons, optionally filtered to active ones',
        response: {
          200: listPersonsResponseSchema,
        },
      },
    },
    async () => {
      const persons = await container.listPersons.execute();
      return withAppMeta({ persons: persons.map(toPersonResponse) });
    },
  );

  typedApp.get(
    '/persons/:id',
    {
      schema: {
        tags: ['persons'],
        description: 'Get a single person by id',
        params: personParamsSchema,
        response: {
          200: personResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const person = await container.getPerson.execute(request.params.id);
      return reply.status(200).send(withAppMeta(toPersonResponse(person)));
    },
  );

  typedApp.post(
    '/persons',
    {
      schema: {
        tags: ['persons'],
        description: 'Create a new person',
        body: createPersonRequestSchema,
        response: {
          201: personResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const person = await container.createPerson.execute({
        name: body.name,
        role: body.role,
        email: body.email,
        password: body.password,
      });
      return reply.status(201).send(withAppMeta(toPersonResponse(person)));
    },
  );

  typedApp.put(
    '/persons/:id',
    {
      schema: {
        tags: ['persons'],
        description: 'Update a person by id',
        params: personParamsSchema,
        body: updatePersonRequestSchema,
        response: {
          200: personResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const person = await container.updatePerson.execute({
        id: request.params.id,
        name: body.name,
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.password !== undefined ? { password: body.password } : {}),
      });
      return reply.status(200).send(withAppMeta(toPersonResponse(person)));
    },
  );

  typedApp.delete(
    '/persons/:id',
    {
      schema: {
        tags: ['persons'],
        description: 'Delete a person by id',
        params: personParamsSchema,
        response: {
          204: deletePersonResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await container.removePerson.execute(request.params.id);
      return reply.status(204).send(null);
    },
  );
}