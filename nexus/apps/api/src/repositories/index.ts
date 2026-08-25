import type { PrismaClient } from '@prisma/client';
import { PrismaBrandRepository } from './brand.repository.js';
import { PrismaCampaignRepository } from './campaign.repository.js';
import { PrismaCreatorRepository } from './creator.repository.js';
import { PrismaDeliverableRepository } from './deliverable.repository.js';
import { PrismaInsightRepository } from './insight.repository.js';
import { PrismaMetricsRepository } from './metrics.repository.js';

export function createRepositories(db: PrismaClient) {
  return {
    brands: new PrismaBrandRepository(db),
    campaigns: new PrismaCampaignRepository(db),
    creators: new PrismaCreatorRepository(db),
    deliverables: new PrismaDeliverableRepository(db),
    insights: new PrismaInsightRepository(db),
    metrics: new PrismaMetricsRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;