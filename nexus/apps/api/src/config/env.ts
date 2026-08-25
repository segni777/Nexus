import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// WHY: crash loudly at boot on bad config instead of failing mysteriously at 2am.
// In Phase 5, Secrets Manager injects these same names — this file never changes.
export const env = EnvSchema.parse(process.env);
