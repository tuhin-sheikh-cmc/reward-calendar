import { describe, expect, it } from 'vitest';
import { RemoveRewardUseCase } from '../../../src/application/use-cases/remove-reward.use-case.js';
import { NotFoundError } from '../../../src/domain/errors/domain-error.js';
import { Reward } from '../../../src/domain/entities/reward.js';
import { FakeRewardRepository } from '../../helpers/fake-reward-repository.js';

describe('RemoveRewardUseCase', () => {
  it('removes an existing reward', async () => {
    const repository = new FakeRewardRepository();
    await repository.seed(Reward.create({ id: 'rw-1', name: 'Keep me', type: 'fixed', value: 1 }));

    await new RemoveRewardUseCase(repository).execute('rw-1');

    await expect(repository.findById('rw-1')).resolves.toBeNull();
  });

  it('throws NotFoundError when the reward does not exist', async () => {
    const repository = new FakeRewardRepository();
    await expect(new RemoveRewardUseCase(repository).execute('missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});