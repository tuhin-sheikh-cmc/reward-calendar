import fastifyStatic from '@fastify/static';
import { FastifyInstance, FastifyReply } from 'fastify';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../../../public/', import.meta.url));

function setStaticHeaders(reply: FastifyReply, path: string): void {
  if (path.endsWith('.html')) {
    reply.header('Cache-Control', 'no-cache');
  }
}

export async function registerStaticFiles(app: FastifyInstance): Promise<void> {
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    index: ['index.html'],
    maxAge: '1h',
    setHeaders: setStaticHeaders,
  });
}