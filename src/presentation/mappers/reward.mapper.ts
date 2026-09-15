import { Reward } from '../../domain/entities/reward.js';
import { RewardItem } from '../schemas/reward.schemas.js';

export function toRewardResponse(reward: Reward): RewardItem {
  return {
    id: reward.id,
    name: reward.name,
    type: reward.type,
    value: reward.value,
    isActive: reward.isActive,
    createdAt: reward.createdAt.toISOString(),
  };
}