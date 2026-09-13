import { describe, expect, it } from 'vitest';
import { Reward } from '../../../src/domain/entities/reward.js';
import {
  FixedStrategy,
  PercentageStrategy,
  RewardPointsCalculator,
} from '../../../src/domain/services/reward-points-calculator.js';

function reward(type: 'percentage' | 'fixed', value: number): Reward {
  return Reward.create({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Test reward',
    type,
    value,
  });
}

describe('RewardPointsCalculator', () => {
  const calculator = new RewardPointsCalculator([
    new PercentageStrategy(),
    new FixedStrategy(),
  ]);

  it('rounds down percentage points to whole points', () => {
    expect(calculator.calculate(reward('percentage', 10), 99)).toBe(9);
  });

  it('computes a full percentage payout', () => {
    expect(calculator.calculate(reward('percentage', 25), 400)).toBe(100);
  });

  it('awarding a fixed amount of points regardless of purchase size', () => {
    expect(calculator.calculate(reward('fixed', 50), 1)).toBe(50);
    expect(calculator.calculate(reward('fixed', 50), 10_000)).toBe(50);
  });

  it('throws when no strategy is registered for the reward type', () => {
    const partial = new RewardPointsCalculator([new PercentageStrategy()]);
    expect(() => partial.calculate(reward('fixed', 10), 100)).toThrow(RangeError);
  });

  it('registering a strategy overrides the default for that type', () => {
    const doubles = new RewardPointsCalculator([
      new PercentageStrategy(),
      new FixedStrategy(),
      {
        type: 'fixed',
        calculate: (value) => Math.max(0, value * 2),
      },
    ]);
    expect(doubles.calculate(reward('fixed', 10), 100)).toBe(20);
  });
});