import { z } from 'zod';

export const rewardTypeSchema = z.enum(['percentage', 'fixed']);

export const createRewardRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: rewardTypeSchema,
  value: z.number().positive(),
});

export const rewardParamsSchema = z.object({
  id: z.string().uuid(),
});

export const rewardSearchParamsSchema = z.object({
  active: z.enum(['true', 'false']).optional(),
});

export const rewardResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: rewardTypeSchema,
  value: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const listRewardsResponseSchema = z.object({
  rewards: z.array(rewardResponseSchema),
});

export const calculatePointsRequestSchema = z.object({
  rewardId: z.string().uuid(),
  amount: z.number().positive(),
});

export const calculatePointsResponseSchema = z.object({
  rewardId: z.string().uuid(),
  points: z.number().nonnegative(),
});

export const errorResponseSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

export type CreateRewardRequest = z.infer<typeof createRewardRequestSchema>;
export type RewardResponse = z.infer<typeof rewardResponseSchema>;
export type ListRewardsResponse = z.infer<typeof listRewardsResponseSchema>;
export type CalculatePointsRequest = z.infer<typeof calculatePointsRequestSchema>;
export type CalculatePointsResponse = z.infer<typeof calculatePointsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;