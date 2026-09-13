import { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../../domain/errors/domain-error.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'ValidationError',
        message: 'Request validation failed',
        issues: error.issues,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'ValidationError',
        message: 'Request validation failed',
        details: error.validation,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    });
  });
}