import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { Person, PersonRole } from '../../src/domain/entities/person.js';
import { PasswordHasher } from '../../src/domain/services/password-hasher.js';

export const TEST_PASSWORD = 'correct-horse-battery';

/** Deterministic hasher keeps route tests fast; production uses scrypt. */
export class TestPasswordHasher implements PasswordHasher {
  public async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  public async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

export function uniqueEmail(prefix = 'member'): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export async function createTestPerson(
  personRepository: {
    save(person: Person): Promise<void>;
    findByEmail(email: string): Promise<Person | null>;
  },
  hasher: PasswordHasher,
  overrides: { name?: string; role?: PersonRole; email?: string; password?: string } = {},
): Promise<Person> {
  const person = Person.create({
    id: randomUUID(),
    name: overrides.name ?? 'Test Person',
    role: overrides.role ?? 'receiver',
    email: overrides.email ?? uniqueEmail(),
    passwordHash: await hasher.hash(overrides.password ?? TEST_PASSWORD),
  });
  await personRepository.save(person);
  return person;
}

export function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export function tokenHeaders(
  app: FastifyInstance,
  claims: { sub?: string; role?: PersonRole; email?: string } = {},
): Record<string, string> {
  const token = app.jwt.sign({
    sub: claims.sub ?? randomUUID(),
    role: claims.role ?? 'receiver',
    email: claims.email ?? uniqueEmail('token'),
  });
  return authHeaders(token);
}
