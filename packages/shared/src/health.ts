import { z } from 'zod';

/** Contrato do endpoint GET /v1/health (usado por API e Web). */
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
