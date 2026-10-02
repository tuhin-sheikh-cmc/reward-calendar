import { z } from 'zod';
import { appMetaSchema } from './app-meta.schema.js';
import { personItemSchema } from './person.schemas.js';

export const loginRequestSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const loginResponseSchema = z
  .object({
    token: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().positive(),
    person: personItemSchema,
  })
  .and(appMetaSchema);

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
