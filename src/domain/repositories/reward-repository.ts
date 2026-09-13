import { Reward } from '../entities/reward.js';

export interface RewardRepository {
  save(reward: Reward): Promise<void>;
  findById(id: string): Promise<Reward | null>;
  findAll(): Promise<Reward[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}