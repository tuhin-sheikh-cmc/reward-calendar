import { describe, expect, it } from 'vitest';
import { GetRewardUseCase } from '../../../src/application/use-cases/get-reward.use-case.js';
import { NotFoundError } from '../../../src/domain/errors/domain-error.js';
import { Reward } from '../../../src/domain/entities/reward.js';
import { FakeRewardRepository } from '../../helpers/fake-reward-repository.js';

describe('GetRewardUseCase', () => {
  it('returns the reward for an existing id', async () => {
    const repository = new FakeRewardRepository();
    const reward = Reward.create({ id: 'rw-1', name: 'Loyalty boost', type: 'percentage', value: 5 });
    await repository.seed(reward);

    const result = await new GetRewardUseCase(repository).execute('rw-1');

    expect(result).toBe(reward);
  });

  it('throws NotFoundError for a missing reward', async () => {
    const repository = new FakeRewardRepository();
    const useCase = new GetRewardUseCase(repository);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute('missing')).rejects.toThrow('Reward with id "missing" was not found');
  });
});