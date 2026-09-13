import { NotFoundError } from '../../domain/errors/domain-error.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';

export class RemoveRewardUseCase {
  constructor(private readonly rewardRepository: RewardRepository) {}

  public async execute(id: string): Promise<void> {
    const reward = await this.rewardRepository.findById(id);
    if (!reward) {
      throw new NotFoundError(`Reward with id "${id}" was not found`);
    }
    await this.rewardRepository.remove(id);
  }
}