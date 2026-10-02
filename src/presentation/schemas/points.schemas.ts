import { z } from 'zod';
import { appMetaSchema } from './app-meta.schema.js';

export const pointsAdjustmentRequestSchema = z.object({
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

export const pointsEntryItemSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  type: z.enum(['earned', 'removed', 'redeemed']),
  points: z.number().int().positive(),
  reason: z.string().optional(),
  balanceAfter: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const listPointsEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const listPointsEntriesResponseSchema = z
  .object({
    personId: z.string().uuid(),
    entries: z.array(pointsEntryItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .and(appMetaSchema);

export type PointsAdjustmentRequest = z.infer<typeof pointsAdjustmentRequestSchema>;
export type PointsAdjustmentResponse = z.infer<typeof pointsAdjustmentResponseSchema>;
export type PointsEntryItem = z.infer<typeof pointsEntryItemSchema>;
export type ListPointsEntriesQuery = z.infer<typeof listPointsEntriesQuerySchema>;
export type ListPointsEntriesResponse = z.infer<typeof listPointsEntriesResponseSchema>;