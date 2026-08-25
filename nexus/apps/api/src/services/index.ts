import type { Repositories } from '../repositories/index.js';
import { BrandService } from './brand.service.js';
import { CampaignService } from './campaign.service.js';
import { CreatorService } from './creator.service.js';
import { DeliverableService } from './deliverable.service.js';
import { InsightService } from './insight.service.js';
import { MetricsService } from './metrics.service.js';

export function createServices(repositories: Repositories) {
  const brands = new BrandService(repositories.brands);
  const creators = new CreatorService(repositories.creators);
  const campaigns = new CampaignService(
    repositories.campaigns,
    repositories.brands,
    repositories.creators,
  );
  const deliverables = new DeliverableService(
    repositories.deliverables,
    repositories.campaigns,
  );

  return {
    brands,
    campaigns,
    creators,
    deliverables,
    insights: new InsightService(repositories.insights),
    metrics: new MetricsService(repositories.metrics, repositories.deliverables),
  };
}

export type Services = ReturnType<typeof createServices>;