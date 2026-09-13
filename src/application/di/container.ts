import { IdGenerator } from '../../domain/services/id-generator.js';
import {
  FixedStrategy,
  PercentageStrategy,
  RewardPointsCalculator,
} from '../../domain/services/reward-points-calculator.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';
import { InMemoryRewardRepository } from '../../infrastructure/repositories/in-memory-reward-repository.js';
import { UuidIdGenerator } from '../../infrastructure/id/uuid-id-generator.js';
import { CreateRewardUseCase } from '../use-cases/create-reward.use-case.js';
import { ListRewardsUseCase } from '../use-cases/list-rewards.use-case.js';
import { GetRewardUseCase } from '../use-cases/get-reward.use-case.js';
import { RemoveRewardUseCase } from '../use-cases/remove-reward.use-case.js';
import { CalculatePointsUseCase } from '../use-cases/calculate-points.use-case.js';

export interface Container {
  rewardRepository: RewardRepository;
  idGenerator: IdGenerator;
  rewardPointsCalculator: RewardPointsCalculator;
  createReward: CreateRewardUseCase;
  listRewards: ListRewardsUseCase;
  getReward: GetRewardUseCase;
  removeReward: RemoveRewardUseCase;
  calculatePoints: CalculatePointsUseCase;
}

const rewardRepository = new InMemoryRewardRepository();
const idGenerator = new UuidIdGenerator();
const rewardPointsCalculator = new RewardPointsCalculator([
  new PercentageStrategy(),
  new FixedStrategy(),
]);

export const container: Container = {
  rewardRepository,
  idGenerator,
  rewardPointsCalculator,
  createReward: new CreateRewardUseCase(rewardRepository, idGenerator),
  listRewards: new ListRewardsUseCase(rewardRepository),
  getReward: new GetRewardUseCase(rewardRepository),
  removeReward: new RemoveRewardUseCase(rewardRepository),
  calculatePoints: new CalculatePointsUseCase(rewardRepository, rewardPointsCalculator),
};