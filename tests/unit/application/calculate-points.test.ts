import { describe, expect, it } from 'vitest';
import { CalculatePointsUseCase } from '../../../src/application/use-cases/calculate-points.use-case.js';
import { Reward } from '../../../src/domain/entities/reward.js';
import {
  FixedStrategy,
  PercentageStrategy,
  RewardPointsCalculator,
} from '../../../src/domain/services/reward-points-calculator.js';
import { NotFoundError } from '../../../src/domain/errors/domain-error.js';
import { FakeRewardRepository } from '../../helpers/fake-reward-repository.js';

const calculator = new RewardPointsCalculator([new PercentageStrategy(), new FixedStrategy()]);

describe('CalculatePointsUseCase', () => {
  it('computes points for an active percentage reward', async () => {
    const repository = new FakeRewardRepository();
    await repository.seed(
      Reward.create({ id: 'rw-perc', name: '10% back', type: 'percentage', value: 10 }),
    );

    const result = await new CalculatePointsUseCase(repository, calculator).execute({
      rewardId: 'rw-perc',
      amount: 250,
    });

    expect(result).toEqual({ rewardId: 'rw-perc', points: 25 });
  });

  it('computes points for a fixed reward', async () => {
    const repository = new FakeRewardRepository();
    await repository.seed(
      Reward.create({ id: 'rw-fixed', name: 'Flat 100', type: 'fixed', value: 100 }),
    );

    const result = await new CalculatePointsUseCase(repository, calculator).execute({
      rewardId: 'rw-fixed',
      amount: 1_000_000,
    });

    expect(result).toEqual({ rewardId: 'rw-fixed', points: 100 });
  });

  it('throws NotFoundError when the reward is missing', async () => {
    const repository = new FakeRewardRepository();
    const useCase = new CalculatePointsUseCase(repository, calculator);

    await expect(
      useCase.execute({ rewardId: 'missing', amount: 10 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when the reward is inactive', async () => {
    const repository = new FakeRewardRepository();
    const inactive = Reward.create({
      id: 'rw-off',
      name: 'Paused',
      type: 'fixed',
      value: 5,
    }).deactivate();
    await repository.seed(inactive);

    await expect(
      new CalculatePointsUseCase(repository, calculator).execute({ rewardId: 'rw-off', amount: 10 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});