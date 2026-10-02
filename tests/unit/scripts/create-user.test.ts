import { describe, expect, it, vi } from 'vitest';
import { parseArgs, runCreateUser } from '../../../src/scripts/create-user.js';
import { Person } from '../../../src/domain/entities/person.js';
import { CreatePersonInput } from '../../../src/application/dtos/person.dtos.js';

function personFor(input: CreatePersonInput): Person {
  return Person.create({
    id: 'ppp-1',
    name: input.name,
    role: input.role,
    email: input.email,
    passwordHash: 'hashed:secret',
  });
}

describe('create-user CLI', () => {
  describe('parseArgs', () => {
    it('parses email, password, name and role', () => {
      expect(
        parseArgs(['--email', 'ada@example.com', '--password', 'pw', '--name', 'Ada', '--role', 'provider']),
      ).toEqual({ email: 'ada@example.com', password: 'pw', name: 'Ada', role: 'provider' });
    });

    it('defaults the name to the email local part and the role to receiver', () => {
      expect(parseArgs(['--email', 'ada@example.com', '--password', 'pw'])).toEqual({
        email: 'ada@example.com',
        password: 'pw',
        name: 'ada',
        role: 'receiver',
      });
    });

    it('rejects a missing email or password', () => {
      expect(parseArgs(['--email', 'ada@example.com'])).toEqual({
        error: 'Both --email and --password are required',
      });
    });

    it('rejects an unknown role', () => {
      expect(parseArgs(['--email', 'a@b.com', '--password', 'pw', '--role', 'admin'])).toEqual({
        error: '--role must be "provider" or "receiver", got "admin"',
      });
    });

    it('rejects a dangling flag', () => {
      expect(parseArgs(['--email'])).toEqual({ error: 'Expected --key value pairs, got "--email"' });
    });
  });

  describe('runCreateUser', () => {
    it('creates the person with validated input', async () => {
      const createPerson = vi.fn(async (input: CreatePersonInput) => personFor(input));

      const result = await runCreateUser(
        ['--email', 'ada@example.com', '--password', 'a-strong-password', '--name', 'Ada'],
        createPerson,
      );

      expect(result.ok).toBe(true);
      expect(createPerson).toHaveBeenCalledWith({
        name: 'Ada',
        role: 'receiver',
        email: 'ada@example.com',
        password: 'a-strong-password',
      });
    });

    it('reports schema violations per field', async () => {
      const createPerson = vi.fn(async (input: CreatePersonInput) => personFor(input));

      const result = await runCreateUser(['--email', 'nope', '--password', 'short'], createPerson);

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('expected a failure');
      }
      expect(result.message).toBe('Invalid input:');
      expect(result.details?.join(' ')).toContain('email');
      expect(result.details?.join(' ')).toContain('password');
      expect(createPerson).not.toHaveBeenCalled();
    });

    it('surfaces domain errors such as a duplicate email', async () => {
      const createPerson = vi.fn(async () => {
        throw new Error('A person with email "ada@example.com" already exists');
      });

      const result = await runCreateUser(
        ['--email', 'ada@example.com', '--password', 'a-strong-password'],
        createPerson,
      );

      expect(result).toEqual({
        ok: false,
        message: 'A person with email "ada@example.com" already exists',
      });
    });

    it('returns usage for bad arguments', async () => {
      const createPerson = vi.fn(async (input: CreatePersonInput) => personFor(input));

      const result = await runCreateUser([], createPerson);

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error('expected a failure');
      }
      expect(result.message).toContain('Usage: create-user');
      expect(createPerson).not.toHaveBeenCalled();
    });
  });
});
