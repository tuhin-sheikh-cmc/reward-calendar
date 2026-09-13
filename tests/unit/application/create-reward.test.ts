import { describe, expect, it, vi } from 'vitest';
import { CreateRewardUseCase } from '../../../src/application/use-cases/create-reward.use-case.js';
import { Reward } from '../../../src/domain/entities/reward.js';
import { FakeRewardRepository } from '../../helpers/fake-reward-repository.js';

describe('CreateRewardUseCase', () => {
  it('persists a reward and returns it with a generated id', async () => {
    const repository = new FakeRewardRepository();
    const idGenerator = { generate: () => 'abc-def' };
    const useCase = new CreateRewardUseCase(repository, idGenerator);

    const reward = await useCase.execute({ name: 'Signup bonus', type: 'fixed', value: 200 });

    expect(reward.id).toBe('abc-def');
    expect(reward.name).toBe('Signup bonus');
    expect(reward.isActive).toBe(true);
    await expect(repository.findById('abc-def')).resolves.toBeInstanceOf(Reward);
  });

  it('delegates id generation to the injected IdGenerator port', async () => {
    const repository = new FakeRewardRepository();
    const generate = vi.fn().mockReturnValue('00000000-0000-4000-8000-000000000040');
    const useCase = new CreateRewardUseCase(repository, { generate });

    const reward = await useCase.execute({ name: 'Referral', type: 'percentage', value: 5 });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(reward.id).toBe('00000000-0000-4000-8000-000000000040');
  });
});