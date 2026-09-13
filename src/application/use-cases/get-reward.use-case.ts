import { NotFoundError } from '../../domain/errors/domain-error.js';
import { Reward } from '../../domain/entities/reward.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';

export class GetRewardUseCase {
  constructor(private readonly rewardRepository: RewardRepository) {}

  public async execute(id: string): Promise<Reward> {
    const reward = await this.rewardRepository.findById(id);
    if (!reward) {
      throw new NotFoundError(`Reward with id "${id}" was not found`);
    }
    return reward;
  }
}