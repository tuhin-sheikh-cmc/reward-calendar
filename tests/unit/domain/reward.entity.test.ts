import { describe, expect, it } from 'vitest';
import { Reward } from '../../../src/domain/entities/reward.js';

describe('Reward entity', () => {
  it('creates a reward with sane defaults', () => {
    const reward = Reward.create({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Birthday bonus',
      type: 'percentage',
      value: 10,
    });

    expect(reward.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(reward.name).toBe('Birthday bonus');
    expect(reward.type).toBe('percentage');
    expect(reward.value).toBe(10);
    expect(reward.isActive).toBe(true);
    expect(reward.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an empty name', () => {
    expect(() =>
      Reward.create({
        id: '00000000-0000-4000-8000-000000000001',
        name: '   ',
        type: 'fixed',
        value: 5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a name longer than 100 characters', () => {
    expect(() =>
      Reward.create({
        id: '00000000-0000-4000-8000-000000000001',
        name: 'x'.repeat(101),
        type: 'fixed',
        value: 5,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-positive value', () => {
    expect(() =>
      Reward.create({
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Points boost',
        type: 'percentage',
        value: 0,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a non-finite value', () => {
    expect(() =>
      Reward.create({
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Points boost',
        type: 'percentage',
        value: Number.NaN,
      }),
    ).toThrow(RangeError);
  });

  it('rehydrates an existing reward from snapshot', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const reward = Reward.fromSnapshot({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Legacy',
      type: 'fixed',
      value: 50,
      isActive: false,
      createdAt,
    });

    expect(reward.isActive).toBe(false);
    expect(reward.createdAt).toBe(createdAt);
  });

  it('deactivates a reward immutably', () => {
    const reward = Reward.create({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Weekly drop',
      type: 'fixed',
      value: 25,
    });

    const deactivated = reward.deactivate();

    expect(deactivated.isActive).toBe(false);
    expect(reward.isActive).toBe(true);
  });
});