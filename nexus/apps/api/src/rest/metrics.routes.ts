import { Router } from 'express';
import { z } from 'zod';
import type { MetricsService } from '../services/metrics.service.js';

const MetricsBody = z.object({
  deliverableId: z.string().uuid(),
  capturedAt: z.coerce.date(),
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  watchTimeSeconds: z.number().int().nonnegative(),
});

export function metricsRoutes(metrics: MetricsService) {
  const router = Router();

  router.post('/metrics', async (req, res) => {
    const input = MetricsBody.parse(req.body);
    const snapshot = await metrics.record(input);
    res.status(201).json({ data: snapshot });
  });

  return router;
}