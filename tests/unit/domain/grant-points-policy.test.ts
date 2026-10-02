import { describe, expect, it } from 'vitest';
import { Person } from '../../../src/domain/entities/person.js';
import { ForbiddenError } from '../../../src/domain/errors/domain-error.js';
import { GrantPointsPolicy } from '../../../src/domain/services/grant-points-policy.js';

function provider(id = 'p-provider', active = true): Person {
  return Person.fromSnapshot({
    id,
    name: 'Provider',
    role: 'provider',
    email: `${id}@example.com`,
    passwordHash: 'hashed:secret',
    isActive: active,
    pointsBalance: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function receiver(id = 'p-receiver', active = true): Person {
  return Person.fromSnapshot({
    id,
    name: 'Receiver',
    role: 'receiver',
    email: `${id}@example.com`,
    passwordHash: 'hashed:secret',
    isActive: active,
    pointsBalance: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('GrantPointsPolicy', () => {
  it('allows an active provider to grant points to another person', () => {
    expect(() => GrantPointsPolicy.assertCanGrant(provider(), receiver())).not.toThrow();
  });

  it('allows a provider to grant points to another provider', () => {
    expect(() => GrantPointsPolicy.assertCanGrant(provider('p1'), provider('p2'))).not.toThrow();
  });

  it('forbids a person granting points to themselves', () => {
    const same = provider('p1');
    expect(() => GrantPointsPolicy.assertCanGrant(same, same)).toThrow(ForbiddenError);
    expect(() => GrantPointsPolicy.assertCanGrant(same, same)).toThrow('cannot grant points to themselves');
  });

  it('forbids a receiver from granting points', () => {
    expect(() => GrantPointsPolicy.assertCanGrant(receiver('p1'), receiver('p2'))).toThrow(
      ForbiddenError,
    );
    expect(() => GrantPointsPolicy.assertCanGrant(receiver('p1'), receiver('p2'))).toThrow(
      'Only providers can grant points',
    );
  });

  it('forbids an inactive provider from granting points', () => {
    expect(() => GrantPointsPolicy.assertCanGrant(provider('p1', false), receiver())).toThrow(
      ForbiddenError,
    );
    expect(() => GrantPointsPolicy.assertCanGrant(provider('p1', false), receiver())).toThrow(
      'provider must be an active person',
    );
  });

  it('forbids granting points to an inactive person', () => {
    expect(() => GrantPointsPolicy.assertCanGrant(provider(), receiver('p2', false))).toThrow(
      ForbiddenError,
    );
    expect(() => GrantPointsPolicy.assertCanGrant(provider(), receiver('p2', false))).toThrow(
      'inactive person',
    );
  });
});