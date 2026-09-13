import { Reward } from '../../domain/entities/reward.js';
import { RewardRepository } from '../../domain/repositories/reward-repository.js';

export class InMemoryRewardRepository implements RewardRepository {
  private readonly rewards = new Map<string, Reward>();

  public async save(reward: Reward): Promise<void> {
    this.rewards.set(reward.id, reward);
  }

  public async findById(id: string): Promise<Reward | null> {
    return this.rewards.get(id) ?? null;
  }

  public async findAll(): Promise<Reward[]> {
    return [...this.rewards.values()];
  }

  public async remove(id: string): Promise<void> {
    this.rewards.delete(id);
  }

  public async clear(): Promise<void> {
    this.rewards.clear();
  }
}