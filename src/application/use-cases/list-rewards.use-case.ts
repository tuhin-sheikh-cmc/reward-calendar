import { Reward } from '../../domain/entities/reward.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';

export class ListRewardsUseCase {
  constructor(private readonly rewardRepository: RewardRepository) {}

  public async execute(onlyActive = false): Promise<Reward[]> {
    const rewards = await this.rewardRepository.findAll();
    return onlyActive ? rewards.filter((reward) => reward.isActive) : rewards;
  }
}