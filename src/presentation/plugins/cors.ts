import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

const DEFAULT_CORS_ORIGIN = 'http://localhost:13003';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

function parseOrigins(value: string | undefined): string[] {
  const raw = (value ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return raw.length > 0 ? raw : [DEFAULT_CORS_ORIGIN];
}

export async function registerCors(app: FastifyInstance): Promise<void> {
  const allowed = parseOrigins(process.env.CORS_ORIGIN);
  const allowAny = allowed.includes('*');

  await app.register(cors, {
    origin: allowAny ? true : allowed,
    methods: ALLOWED_METHODS,
    maxAge: 600,
  });
}
