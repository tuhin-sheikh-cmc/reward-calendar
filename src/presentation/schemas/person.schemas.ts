import { z } from 'zod';
import { appMetaSchema } from './app-meta.schema.js';

export const personParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createPersonRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(200).optional(),
});

export const updatePersonRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(200).optional(),
});

export const personItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().optional(),
  isActive: z.boolean(),
  pointsBalance: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const personResponseSchema = personItemSchema.and(appMetaSchema);

export const listPersonsResponseSchema = z
  .object({
    persons: z.array(personItemSchema),
  })
  .and(appMetaSchema);

export const deletePersonResponseSchema = z.null().describe('Person deleted');

export type CreatePersonRequest = z.infer<typeof createPersonRequestSchema>;
export type UpdatePersonRequest = z.infer<typeof updatePersonRequestSchema>;
export type PersonItem = z.infer<typeof personItemSchema>;
export type PersonResponse = z.infer<typeof personResponseSchema>;
export type ListPersonsResponse = z.infer<typeof listPersonsResponseSchema>;