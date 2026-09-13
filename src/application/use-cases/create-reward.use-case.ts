import { IdGenerator } from '../../domain/services/id-generator.js';
import { Reward } from '../../domain/entities/reward.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';
import { CreateRewardInput } from '../dtos/reward.dtos.js';

export class CreateRewardUseCase {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  public async execute(input: CreateRewardInput): Promise<Reward> {
    const reward = Reward.create({
      id: this.idGenerator.generate(),
      name: input.name,
      type: input.type,
      value: input.value,
    });
    await this.rewardRepository.save(reward);
    return reward;
  }
}