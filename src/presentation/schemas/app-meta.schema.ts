import { z } from 'zod';

export const appMetaSchema = z.object({
  appVersion: z.string(),
  timestamp: z.number(),
});

export type AppMeta = z.infer<typeof appMetaSchema>;