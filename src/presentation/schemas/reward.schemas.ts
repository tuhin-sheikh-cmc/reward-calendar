import { z } from 'zod';
import { appMetaSchema } from './app-meta.schema.js';

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

export const rewardItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: rewardTypeSchema,
  value: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const rewardResponseSchema = rewardItemSchema.and(appMetaSchema);

export const listRewardsResponseSchema = z
  .object({
    rewards: z.array(rewardItemSchema),
  })
  .and(appMetaSchema);

export const calculatePointsRequestSchema = z.object({
  rewardId: z.string().uuid(),
  amount: z.number().positive(),
});

export const calculatePointsResponseSchema = z
  .object({
    rewardId: z.string().uuid(),
    points: z.number().nonnegative(),
  })
  .and(appMetaSchema);

export const deleteRewardResponseSchema = z.null().describe('Reward deleted');

export const errorResponseSchema = z
  .object({
    statusCode: z.number(),
    error: z.string(),
    message: z.string(),
  })
  .and(appMetaSchema);

export type CreateRewardRequest = z.infer<typeof createRewardRequestSchema>;
export type RewardItem = z.infer<typeof rewardItemSchema>;
export type RewardResponse = z.infer<typeof rewardResponseSchema>;
export type ListRewardsResponse = z.infer<typeof listRewardsResponseSchema>;
export type CalculatePointsRequest = z.infer<typeof calculatePointsRequestSchema>;
export type CalculatePointsResponse = z.infer<typeof calculatePointsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;