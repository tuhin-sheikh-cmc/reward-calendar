import { Reward } from '../entities/reward.js';

export interface PointsCalculationStrategy {
  readonly type: Reward['type'];
  calculate(value: number, amount: number): number;
}

export class PercentageStrategy implements PointsCalculationStrategy {
  public readonly type = 'percentage' as const;

  public calculate(value: number, amount: number): number {
    return Math.floor((value / 100) * amount);
  }
}

export class FixedStrategy implements PointsCalculationStrategy {
  public readonly type = 'fixed' as const;

  public calculate(value: number): number {
    return value;
  }
}

export class RewardPointsCalculator {
  private readonly strategies: Record<Reward['type'], PointsCalculationStrategy>;

  constructor(strategies: PointsCalculationStrategy[]) {
    this.strategies = Object.fromEntries(
      strategies.map((strategy) => [strategy.type, strategy]),
    ) as Record<Reward['type'], PointsCalculationStrategy>;
  }

  public calculate(reward: Reward, amount: number): number {
    const strategy = this.strategies[reward.type];
    if (!strategy) {
      throw new RangeError(`No strategy registered for reward type "${reward.type}"`);
    }
    return strategy.calculate(reward.value, amount);
  }
}