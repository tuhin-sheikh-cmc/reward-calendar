import { NotFoundError } from '../../domain/errors/domain-error.js';
import { RewardPointsCalculator } from '../../domain/services/reward-points-calculator.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';
import { CalculatePointsInput } from '../dtos/reward.dtos.js';

export interface CalculatePointsResult {
  rewardId: string;
  points: number;
}

export class CalculatePointsUseCase {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly calculator: RewardPointsCalculator,
  ) {}

  public async execute(input: CalculatePointsInput): Promise<CalculatePointsResult> {
    const reward = await this.rewardRepository.findById(input.rewardId);
    if (!reward) {
      throw new NotFoundError(`Reward with id "${input.rewardId}" was not found`);
    }
    if (!reward.isActive) {
      throw new NotFoundError(`Reward with id "${input.rewardId}" is not active`);
    }
    return {
      rewardId: reward.id,
      points: this.calculator.calculate(reward, input.amount),
    };
  }
}