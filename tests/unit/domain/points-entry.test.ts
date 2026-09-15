import { describe, expect, it } from 'vitest';
import { PointsEntry } from '../../../src/domain/entities/points-entry.js';
import { ValidationError } from '../../../src/domain/errors/domain-error.js';

describe('PointsEntry entity', () => {
  it('creates an entry with a timestamp', () => {
    const entry = PointsEntry.create({
      id: 'e1',
      personId: 'p1',
      type: 'earned',
      points: 100,
      balanceAfter: 100,
    });

    expect(entry.id).toBe('e1');
    expect(entry.personId).toBe('p1');
    expect(entry.type).toBe('earned');
    expect(entry.points).toBe(100);
    expect(entry.balanceAfter).toBe(100);
    expect(entry.reason).toBeUndefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('stores a reason when provided', () => {
    const entry = PointsEntry.create({
      id: 'e1',
      personId: 'p1',
      type: 'removed',
      points: 10,
      reason: 'Adjustment',
      balanceAfter: 90,
    });
    expect(entry.reason).toBe('Adjustment');
  });

  it('rejects invalid points', () => {
    expect(() =>
      PointsEntry.create({ id: 'e1', personId: 'p1', type: 'earned', points: 0, balanceAfter: 0 }),
    ).toThrow(ValidationError);
    expect(() =>
      PointsEntry.create({ id: 'e1', personId: 'p1', type: 'earned', points: -1, balanceAfter: 0 }),
    ).toThrow(ValidationError);
  });

  it('rejects a negative balance after adjustment', () => {
    expect(() =>
      PointsEntry.create({ id: 'e1', personId: 'p1', type: 'redeemed', points: 5, balanceAfter: -1 }),
    ).toThrow(ValidationError);
  });
});