import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { normalizePage } from '../repositories/page.js';
import { pageRows, toConnection } from './connections.js';
import type { Resolvers } from './generated/resolver-types.js';

export const resolvers: Resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    health: () => 'ok',
    brand: (_parent, { id }, { services }) => services.brands.get(id),
    brands: async (_parent, { page }, { services }) =>
      toConnection(await services.brands.list(page)),
    creator: (_parent, { id }, { services }) => services.creators.get(id),
    creators: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.creators.list(filter ?? {}, page)),
    campaign: (_parent, { id }, { services }) => services.campaigns.get(id),
    campaigns: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.campaigns.list(filter ?? {}, page)),
    deliverable: (_parent, { id }, { services }) => services.deliverables.get(id),
    deliverables: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.deliverables.list(filter ?? {}, page)),
    insights: async (_parent, { page, scope, scopeId }, { services }) =>
      toConnection(await services.insights.list(scope, scopeId, page)),
  },

  Mutation: {
    createCreator: (_parent, { input }, { services }) => services.creators.create(input),
    updateCreatorStatus: (_parent, { id, status }, { services }) =>
      services.creators.updateStatus(id, status),
    createCampaign: (_parent, { input }, { services }) => services.campaigns.create(input),
    updateCampaignStatus: (_parent, { id, status }, { services }) =>
      services.campaigns.updateStatus(id, status),
    assignCreatorToCampaign: (_parent, { input }, { services }) =>
      services.campaigns.assignCreator(input),
    createDeliverable: (_parent, { input }, { services }) =>
      services.deliverables.create(input),
    updateDeliverableStatus: (_parent, { input }, { services }) =>
      services.deliverables.updateStatus(input),
  },

  Brand: {
    campaigns: async (brand, { page }, { services }) =>
      toConnection(await services.campaigns.list({ brandId: brand.id }, page)),
  },

  Creator: {
    campaigns: async (creator, { page }, { services }) =>
      toConnection(await services.campaigns.list({ creatorId: creator.id }, page)),
    deliverables: async (creator, { page }, { loaders }) => {
      const normalized = normalizePage(page);
      const rows = await loaders.deliverablesByCreatorId.load(creator.id);
      return toConnection(pageRows(rows, normalized.offset, normalized.limit));
    },
  },

  Campaign: {
    brand: (campaign, _args, { loaders }) => loaders.brandById.load(campaign.brandId),
    creators: async (campaign, { page }, { services }) =>
      toConnection(await services.campaigns.listAssignments(campaign.id, page)),
    deliverables: async (campaign, { page }, { services }) =>
      toConnection(await services.deliverables.list({ campaignId: campaign.id }, page)),
  },

  CampaignCreator: {
    creator: (assignment, _args, { loaders }) =>
      loaders.creatorById.load(assignment.creatorId),
  },

  Deliverable: {
    campaign: (deliverable, _args, { loaders }) =>
      loaders.campaignById.load(deliverable.campaignId),
    creator: (deliverable, _args, { loaders }) =>
      loaders.creatorById.load(deliverable.creatorId),
    metrics: async (deliverable, { page }, { services }) =>
      toConnection(await services.metrics.list(deliverable.id, page)),
  },
};