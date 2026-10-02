import { describe, expect, it } from 'vitest';
import { Person } from '../../../src/domain/entities/person.js';
import { ValidationError } from '../../../src/domain/errors/domain-error.js';

type CreatePersonProps = {
  id: string;
  name: string;
  role: 'provider' | 'receiver';
  email: string;
  passwordHash: string;
};

function rawCreate(props: Record<string, unknown>): Person {
  return Person.create(props as unknown as CreatePersonProps);
}

function createPerson(
  overrides: Partial<{
    id: string;
    name: string;
    role: 'provider' | 'receiver';
    email: string;
    passwordHash: string;
  }> = {},
): Person {
  return Person.create({
    id: overrides.id ?? 'p1',
    name: overrides.name ?? 'Ada Lovelace',
    role: overrides.role ?? 'receiver',
    email: overrides.email ?? 'ada@example.com',
    passwordHash: overrides.passwordHash ?? 'hashed:secret',
  });
}

describe('Person entity', () => {
  it('creates an active person with zero points and timestamps', () => {
    const person = createPerson();

    expect(person.id).toBe('p1');
    expect(person.name).toBe('Ada Lovelace');
    expect(person.role).toBe('receiver');
    expect(person.email).toBe('ada@example.com');
    expect(person.passwordHash).toBe('hashed:secret');
    expect(person.isActive).toBe(true);
    expect(person.pointsBalance).toBe(0);
    expect(person.createdAt).toBeInstanceOf(Date);
    expect(person.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects a missing or empty email', () => {
    expect(() => rawCreate({ id: 'p1', name: 'Ada', role: 'receiver', passwordHash: 'h' })).toThrow(
      ValidationError,
    );
    expect(() => createPerson({ email: ' ' })).toThrow(ValidationError);
  });

  it('rejects a missing or empty password hash', () => {
    expect(() => rawCreate({ id: 'p1', name: 'Ada', role: 'receiver', email: 'a@b.com' })).toThrow(
      ValidationError,
    );
    expect(() => createPerson({ passwordHash: ' ' })).toThrow(ValidationError);
  });

  it('rejects an invalid name', () => {
    expect(() => createPerson({ name: '' })).toThrow(RangeError);
    expect(() => createPerson({ name: 'x'.repeat(101) })).toThrow(RangeError);
  });

  it('rejects an unknown role', () => {
    expect(() =>
      rawCreate({ id: 'p1', name: 'Ada', role: 'admin', email: 'a@b.com', passwordHash: 'h' }),
    ).toThrow(ValidationError);
  });

  it('is restored from a snapshot', () => {
    const snapshot = {
      id: 'p1',
      name: 'Ada',
      role: 'provider' as const,
      email: 'ada@example.com',
      passwordHash: 'hashed:snapshot',
      isActive: false,
      pointsBalance: 120,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    const person = Person.fromSnapshot(snapshot);

    expect(person.role).toBe('provider');
    expect(person.email).toBe('ada@example.com');
    expect(person.passwordHash).toBe('hashed:snapshot');
    expect(person.isActive).toBe(false);
    expect(person.pointsBalance).toBe(120);
    expect(person.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('updates name and email and bumps updatedAt', () => {
    const original = createPerson();
    const updated = original.update({ name: 'Ada G.', email: 'ada.g@example.com' });

    expect(updated.name).toBe('Ada G.');
    expect(updated.email).toBe('ada.g@example.com');
    expect(updated.role).toBe('receiver');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  it('keeps the email when updating without one', () => {
    const original = createPerson();
    const updated = original.update({ name: 'Ada G.' });

    expect(updated.email).toBe('ada@example.com');
  });

  it('rejects an empty email on update', () => {
    const original = createPerson();
    expect(() => original.update({ name: 'Ada', email: ' ' })).toThrow(ValidationError);
  });

  it('replaces the password hash on update', () => {
    const original = createPerson();
    const updated = original.update({ name: 'Ada', passwordHash: 'hashed:rotated' });

    expect(updated.passwordHash).toBe('hashed:rotated');
  });

  it('keeps the password hash when updating without one', () => {
    const original = createPerson();
    expect(original.update({ name: 'Ada G.' }).passwordHash).toBe('hashed:secret');
  });

  it('rejects an empty password hash on update', () => {
    const original = createPerson();
    expect(() => original.update({ name: 'Ada', passwordHash: '' })).toThrow(ValidationError);
  });

  it('updates the role when provided', () => {
    const original = createPerson();
    const updated = original.update({ name: 'Ada', role: 'provider' });

    expect(updated.role).toBe('provider');
    expect(original.role).toBe('receiver');
  });

  it('keeps the role when updating without one', () => {
    expect(createPerson({ role: 'provider' }).update({ name: 'Ada G.' }).role).toBe('provider');
  });

  it('rejects an unknown role on update', () => {
    expect(() => createPerson().update({ name: 'Ada', role: 'admin' as never })).toThrow(
      ValidationError,
    );
  });

  it('deactivates without changing other fields', () => {
    const deactivated = createPerson().deactivate();

    expect(deactivated.isActive).toBe(false);
    expect(deactivated.name).toBe('Ada Lovelace');
    expect(deactivated.role).toBe('receiver');
    expect(deactivated.email).toBe('ada@example.com');
  });

  describe('addPoints', () => {
    it('increments the balance', () => {
      expect(createPerson().addPoints(50).pointsBalance).toBe(50);
    });

    it('rejects non-positive or non-integer points', () => {
      const person = createPerson();
      expect(() => person.addPoints(0)).toThrow(ValidationError);
      expect(() => person.addPoints(-5)).toThrow(ValidationError);
      expect(() => person.addPoints(3.5)).toThrow(ValidationError);
    });

    it('keeps the original person unchanged', () => {
      const person = createPerson();
      person.addPoints(50);
      expect(person.pointsBalance).toBe(0);
    });
  });

  describe('removePoints', () => {
    it('decrements the balance', () => {
      expect(createPerson().addPoints(100).removePoints(30).pointsBalance).toBe(70);
    });

    it('rejects removing more than the available balance', () => {
      expect(() => createPerson().addPoints(10).removePoints(11)).toThrow(ValidationError);
    });

    it('rejects non-positive points', () => {
      expect(() => createPerson().addPoints(10).removePoints(0)).toThrow(ValidationError);
    });
  });

  describe('redeemPoints', () => {
    it('decrements the balance', () => {
      expect(createPerson().addPoints(100).redeemPoints(25).pointsBalance).toBe(75);
    });

    it('rejects redeeming more than the available balance', () => {
      expect(() => createPerson().addPoints(5).redeemPoints(6)).toThrow(ValidationError);
    });
  });
});
