import { PrismaClient } from '@prisma/client';

// WHY: one client = one connection pool. Instantiating per-request
// exhausts Postgres connections under load.
export const prisma = new PrismaClient();
