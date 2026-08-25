import type {
  Campaign,
  CampaignCreator,
  CampaignRole,
  CampaignStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export type CampaignFilter = {
  status?: CampaignStatus | null;
  brandId?: string | null;
  creatorId?: string | null;
};

export type NewCampaign = {
  brandId: string;
  name: string;
  budgetCents: number;
  startDate: Date;
  endDate: Date;
};

export type NewCampaignAssignment = {
  campaignId: string;
  creatorId: string;
  agreedRateCents: number;
  role: CampaignRole;
};

export interface CampaignRepository {
  findById(id: string): Promise<Campaign | null>;
  findManyByIds(ids: readonly string[]): Promise<Campaign[]>;
  list(
    filter: CampaignFilter,
    page: PageRequest,
  ): Promise<Page<Campaign>>;
  create(input: NewCampaign): Promise<Campaign>;
  updateStatus(
    id: string,
    status: CampaignStatus,
  ): Promise<Campaign>;
  findAssignment(
    campaignId: string,
    creatorId: string,
  ): Promise<CampaignCreator | null>;
  listAssignments(
    campaignId: string,
    page: PageRequest,
  ): Promise<Page<CampaignCreator>>;
  createAssignment(
    input: NewCampaignAssignment,
  ): Promise<CampaignCreator>;
}

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.campaign.findUnique({
      where: { id },
    });
  }

  findManyByIds(ids: readonly string[]) {
    return this.db.campaign.findMany({
      where: {
        id: { in: [...ids] },
      },
    });
  }

  async list(
    filter: CampaignFilter,
    page: PageRequest,
  ): Promise<Page<Campaign>> {
    const where: Prisma.CampaignWhereInput = {
      status: filter.status ?? undefined,
      brandId: filter.brandId ?? undefined,
      creators: filter.creatorId
        ? { some: { creatorId: filter.creatorId } }
        : undefined,
    };

    const [items, totalCount] = await Promise.all([
      this.db.campaign.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.campaign.count({ where }),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }

  create(input: NewCampaign) {
    return this.db.campaign.create({
      data: input,
    });
  }

  updateStatus(id: string, status: CampaignStatus) {
    return this.db.campaign.update({
      where: { id },
      data: { status },
    });
  }

  findAssignment(campaignId: string, creatorId: string) {
    return this.db.campaignCreator.findUnique({
      where: {
        campaignId_creatorId: {
          campaignId,
          creatorId,
        },
      },
    });
  }

  async listAssignments(
    campaignId: string,
    page: PageRequest,
  ): Promise<Page<CampaignCreator>> {
    const where: Prisma.CampaignCreatorWhereInput = {
      campaignId,
    };

    const [items, totalCount] = await Promise.all([
      this.db.campaignCreator.findMany({
        where,
        orderBy: [{ creatorId: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.campaignCreator.count({ where }),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }

  createAssignment(input: NewCampaignAssignment) {
    return this.db.campaignCreator.create({
      data: input,
    });
  }

  
  
}