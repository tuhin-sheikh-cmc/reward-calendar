import { z } from 'zod';

export const healthCheckResponseSchema = z.object({
  status: z.literal('OK'),
  appVersion: z.string(),
  timestamp: z.number(),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;