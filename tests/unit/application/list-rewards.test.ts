import { describe, expect, it } from 'vitest';
import { ListRewardsUseCase } from '../../../src/application/use-cases/list-rewards.use-case.js';
import { Reward } from '../../../src/domain/entities/reward.js';
import { FakeRewardRepository } from '../../helpers/fake-reward-repository.js';

function activeReward(id: string): Reward {
  return Reward.create({ id, name: `Reward ${id}`, type: 'fixed', value: 10 });
}

describe('ListRewardsUseCase', () => {
  it('returns all rewards when no filter is applied', async () => {
    const repository = new FakeRewardRepository();
    await repository.seed(activeReward('rw-1'));
    await repository.seed(activeReward('rw-2'));

    const result = await new ListRewardsUseCase(repository).execute();

    expect(result).toHaveLength(2);
  });

  it('filters to active rewards only when requested', async () => {
    const repository = new FakeRewardRepository();
    await repository.seed(activeReward('rw-1'));
    const inactive = activeReward('rw-2').deactivate();
    await repository.seed(inactive);

    const result = await new ListRewardsUseCase(repository).execute(true);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('rw-1');
  });

  it('returns an empty list when nothing is stored', async () => {
    const repository = new FakeRewardRepository();
    const result = await new ListRewardsUseCase(repository).execute();
    expect(result).toEqual([]);
  });
});