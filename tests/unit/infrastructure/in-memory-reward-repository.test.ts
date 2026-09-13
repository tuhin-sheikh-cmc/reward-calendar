import { describe, expect, it } from 'vitest';
import { Reward } from '../../../src/domain/entities/reward.js';
import { InMemoryRewardRepository } from '../../../src/infrastructure/repositories/in-memory-reward-repository.js';

describe('InMemoryRewardRepository', () => {
  it('persists and retrieves a reward by id', async () => {
    const repository = new InMemoryRewardRepository();
    const reward = Reward.create({ id: 'rw-1', name: 'Store credit', type: 'fixed', value: 30 });

    await repository.save(reward);

    await expect(repository.findById('rw-1')).resolves.toBe(reward);
  });

  it('returns null for an unknown id', async () => {
    const repository = new InMemoryRewardRepository();
    await expect(repository.findById('nope')).resolves.toBeNull();
  });

  it('lists all stored rewards', async () => {
    const repository = new InMemoryRewardRepository();
    await repository.save(Reward.create({ id: 'rw-a', name: 'A', type: 'fixed', value: 1 }));
    await repository.save(Reward.create({ id: 'rw-b', name: 'B', type: 'fixed', value: 2 }));

    const all = await repository.findAll();

    expect(all).toHaveLength(2);
  });

  it('removes a reward by id', async () => {
    const repository = new InMemoryRewardRepository();
    const reward = Reward.create({ id: 'rw-1', name: 'Go away', type: 'fixed', value: 1 });
    await repository.save(reward);

    await repository.remove('rw-1');

    await expect(repository.findById('rw-1')).resolves.toBeNull();
  });
});