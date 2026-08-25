import type { CampaignStatus } from '@prisma/client';
import {
  ConflictError,
  InputError,
  InvalidTransitionError,
  NotFoundError,
} from '../errors/app-error.js';
import type { BrandRepository } from '../repositories/brand.repository.js';
import type {
  CampaignFilter,
  CampaignRepository,
  NewCampaign,
  NewCampaignAssignment,
} from '../repositories/campaign.repository.js';
import type { CreatorRepository } from '../repositories/creator.repository.js';
import {
  normalizePage,
  type PageRequest,
} from '../repositories/page.js';

const transitions: Record<
  CampaignStatus,
  readonly CampaignStatus[]
> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export class CampaignService {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly brands: BrandRepository,
    private readonly creators: CreatorRepository,
  ) {}

  list(
    filter: CampaignFilter,
    page?: Partial<PageRequest> | null,
  ) {
    return this.campaigns.list(filter, normalizePage(page));
  }

  async get(id: string) {
    const campaign = await this.campaigns.findById(id);

    if (!campaign) {
      throw new NotFoundError('Campaign', id);
    }

    return campaign;
  }

  findManyByIds(ids: readonly string[]) {
    return this.campaigns.findManyByIds(ids);
  }

  async create(input: NewCampaign) {
    if (input.budgetCents <= 0) {
      throw new InputError('budgetCents must be positive');
    }

    if (input.startDate >= input.endDate) {
      throw new InputError(
        'startDate must be earlier than endDate',
      );
    }

    const brand = await this.brands.findById(input.brandId);

    if (!brand) {
      throw new NotFoundError('Brand', input.brandId);
    }

    // The repository input contains no status field, so Prisma applies
    // the schema default of DRAFT.
    return this.campaigns.create(input);
  }

  async updateStatus(
    id: string,
    nextStatus: CampaignStatus,
  ) {
    const campaign = await this.get(id);

    if (campaign.status === nextStatus) {
      return campaign;
    }

    if (!transitions[campaign.status].includes(nextStatus)) {
      throw new InvalidTransitionError(
        'Campaign',
        campaign.status,
        nextStatus,
      );
    }

    return this.campaigns.updateStatus(id, nextStatus);
  }

  async assignCreator(input: NewCampaignAssignment) {
    if (input.agreedRateCents <= 0) {
      throw new InputError(
        'agreedRateCents must be positive',
      );
    }

    const campaign = await this.get(input.campaignId);

    if (
      campaign.status === 'COMPLETED' ||
      campaign.status === 'CANCELLED'
    ) {
      throw new ConflictError(
        `Creators cannot be assigned to a ${campaign.status} campaign`,
      );
    }

    const creator = await this.creators.findById(
      input.creatorId,
    );

    if (!creator) {
      throw new NotFoundError('Creator', input.creatorId);
    }

    const existing =
      await this.campaigns.findAssignment(
        input.campaignId,
        input.creatorId,
      );

    if (existing) {
      throw new ConflictError(
        'Creator is already assigned to this campaign',
      );
    }

    return this.campaigns.createAssignment(input);
  }

  async listAssignments(
    campaignId: string,
    page?: Partial<PageRequest> | null,
  ) {
    await this.get(campaignId);

    return this.campaigns.listAssignments(
      campaignId,
      normalizePage(page),
    );
  }
}