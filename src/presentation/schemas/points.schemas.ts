import { z } from 'zod';
import { appMetaSchema } from './app-meta.schema.js';

export const pointsAdjustmentRequestSchema = z.object({
  personId: z.string().uuid(),
  points: z.number().int().positive(),
  reason: z.string().trim().max(200).optional(),
});

export const grantPointsRequestSchema = z.object({
  providerId: z.string().uuid(),
  personId: z.string().uuid(),
  points: z.number().int().positive(),
  reason: z.string().trim().max(200).optional(),
});

export const pointsAdjustmentResponseSchema = z
  .object({
    personId: z.string().uuid(),
    type: z.enum(['earned', 'removed', 'redeemed']),
    points: z.number().int().positive(),
    balance: z.number().int().nonnegative(),
  })
  .and(appMetaSchema);

export type PointsAdjustmentRequest = z.infer<typeof pointsAdjustmentRequestSchema>;
export type GrantPointsRequest = z.infer<typeof grantPointsRequestSchema>;
export type PointsAdjustmentResponse = z.infer<typeof pointsAdjustmentResponseSchema>;