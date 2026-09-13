export interface CreateRewardInput {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CalculatePointsInput {
  rewardId: string;
  amount: number;
}