import { describe, expect, it } from 'vitest';
import { Person } from '../../../src/domain/entities/person.js';
import { ValidationError } from '../../../src/domain/errors/domain-error.js';

describe('Person entity', () => {
  it('creates an active person with zero points and timestamps', () => {
    const person = Person.create({ id: 'p1', name: 'Ada Lovelace', role: 'receiver' });

    expect(person.id).toBe('p1');
    expect(person.name).toBe('Ada Lovelace');
    expect(person.role).toBe('receiver');
    expect(person.email).toBeUndefined();
    expect(person.isActive).toBe(true);
    expect(person.pointsBalance).toBe(0);
    expect(person.createdAt).toBeInstanceOf(Date);
    expect(person.updatedAt).toBeInstanceOf(Date);
  });

  it('stores an email when provided', () => {
    const person = Person.create({
      id: 'p1',
      name: 'Ada',
      role: 'provider',
      email: 'ada@example.com',
    });
    expect(person.email).toBe('ada@example.com');
  });

  it('ignores an empty email', () => {
    const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver', email: ' ' });
    expect(person.email).toBeUndefined();
  });

  it('rejects an invalid name', () => {
    expect(() => Person.create({ id: 'p1', name: '', role: 'receiver' })).toThrow(RangeError);
    expect(() => Person.create({ id: 'p1', name: 'x'.repeat(101), role: 'receiver' })).toThrow(
      RangeError,
    );
  });

  it('rejects an unknown role', () => {
    expect(() => Person.create({ id: 'p1', name: 'Ada', role: 'admin' as never })).toThrow(
      ValidationError,
    );
  });

  it('is restored from a snapshot', () => {
    const snapshot = {
      id: 'p1',
      name: 'Ada',
      role: 'provider' as const,
      email: 'ada@example.com',
      isActive: false,
      pointsBalance: 120,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    const person = Person.fromSnapshot(snapshot);

    expect(person.role).toBe('provider');
    expect(person.isActive).toBe(false);
    expect(person.pointsBalance).toBe(120);
    expect(person.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('updates name and email and bumps updatedAt', () => {
    const original = Person.create({
      id: 'p1',
      name: 'Ada',
      role: 'receiver',
      email: 'ada@example.com',
    });
    const updated = original.update({ name: 'Ada G.', email: 'ada.g@example.com' });

    expect(updated.name).toBe('Ada G.');
    expect(updated.email).toBe('ada.g@example.com');
    expect(updated.role).toBe('receiver');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
  });

  it('updates the role when provided', () => {
    const original = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
    const updated = original.update({ name: 'Ada', role: 'provider' });

    expect(updated.role).toBe('provider');
    expect(original.role).toBe('receiver');
  });

  it('keeps the role when updating without one', () => {
    const original = Person.create({ id: 'p1', name: 'Ada', role: 'provider' });
    expect(original.update({ name: 'Ada G.' }).role).toBe('provider');
  });

  it('rejects an unknown role on update', () => {
    const original = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
    expect(() => original.update({ name: 'Ada', role: 'admin' as never })).toThrow(
      ValidationError,
    );
  });

  it('clears the email when updating without one', () => {
    const original = Person.create({
      id: 'p1',
      name: 'Ada',
      role: 'receiver',
      email: 'ada@example.com',
    });
    const updated = original.update({ name: 'Ada' });

    expect(updated.email).toBeUndefined();
  });

  it('deactivates without changing other fields', () => {
    const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
    const deactivated = person.deactivate();

    expect(deactivated.isActive).toBe(false);
    expect(deactivated.name).toBe('Ada');
    expect(deactivated.role).toBe('receiver');
  });

  describe('addPoints', () => {
    it('increments the balance', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
      const boosted = person.addPoints(50);
      expect(boosted.pointsBalance).toBe(50);
    });

    it('rejects non-positive or non-integer points', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
      expect(() => person.addPoints(0)).toThrow(ValidationError);
      expect(() => person.addPoints(-5)).toThrow(ValidationError);
      expect(() => person.addPoints(3.5)).toThrow(ValidationError);
    });

    it('keeps the original person unchanged', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' });
      person.addPoints(50);
      expect(person.pointsBalance).toBe(0);
    });
  });

  describe('removePoints', () => {
    it('decrements the balance', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }).addPoints(100);
      expect(person.removePoints(30).pointsBalance).toBe(70);
    });

    it('rejects removing more than the available balance', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }).addPoints(10);
      expect(() => person.removePoints(11)).toThrow(ValidationError);
    });

    it('rejects non-positive points', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }).addPoints(10);
      expect(() => person.removePoints(0)).toThrow(ValidationError);
    });
  });

  describe('redeemPoints', () => {
    it('decrements the balance', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }).addPoints(100);
      expect(person.redeemPoints(25).pointsBalance).toBe(75);
    });

    it('rejects redeeming more than the available balance', () => {
      const person = Person.create({ id: 'p1', name: 'Ada', role: 'receiver' }).addPoints(5);
      expect(() => person.redeemPoints(6)).toThrow(ValidationError);
    });
  });
});