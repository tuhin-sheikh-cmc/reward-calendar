import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { ForbiddenError, UnauthorizedError } from '../../domain/errors/domain-error.js';

export const DEFAULT_JWT_SECRET = 'puroshkar-development-secret';
export const DEFAULT_TOKEN_TTL_SECONDS = 3600;

export interface AuthTokenClaims {
  sub: string;
  role: string;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenClaims;
    user: AuthTokenClaims;
  }
}

function readTtlSeconds(): number {
  const raw = process.env.JWT_TTL_SECONDS;
  if (raw === undefined) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TOKEN_TTL_SECONDS;
}

export function getTokenTtlSeconds(): number {
  return readTtlSeconds();
}

export function signToken(app: FastifyInstance, claims: AuthTokenClaims): string {
  return app.jwt.sign(claims, { expiresIn: getTokenTtlSeconds() });
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  });
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Missing or invalid bearer token');
  }
}

export async function requireProvider(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (request.user.role !== 'provider') {
    throw new ForbiddenError('Only providers can perform this action');
  }
}
