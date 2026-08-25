import type {
  Deliverable,
  DeliverableStatus,
  DeliverableType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export type DeliverableFilter = {
  status?: DeliverableStatus | null;
  campaignId?: string | null;
  creatorId?: string | null;
};

export type NewDeliverable = {
  campaignId: string;
  creatorId: string;
  type: DeliverableType;
  dueDate: Date;
};

export interface DeliverableRepository {
  findById(id: string): Promise<Deliverable | null>;
  list(
    filter: DeliverableFilter,
    page: PageRequest,
  ): Promise<Page<Deliverable>>;
  findManyByCreatorIds(
    ids: readonly string[],
  ): Promise<Deliverable[]>;
  create(input: NewDeliverable): Promise<Deliverable>;
  updateStatus(
    id: string,
    status: DeliverableStatus,
    postedUrl?: string | null,
  ): Promise<Deliverable>;
}

export class PrismaDeliverableRepository
  implements DeliverableRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.deliverable.findUnique({
      where: { id },
    });
  }

  async list(
    filter: DeliverableFilter,
    page: PageRequest,
  ): Promise<Page<Deliverable>> {
    const where: Prisma.DeliverableWhereInput = {
      status: filter.status ?? undefined,
      campaignId: filter.campaignId ?? undefined,
      creatorId: filter.creatorId ?? undefined,
    };

    const [items, totalCount] = await Promise.all([
      this.db.deliverable.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.deliverable.count({ where }),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }

  findManyByCreatorIds(ids: readonly string[]) {
    return this.db.deliverable.findMany({
      where: {
        creatorId: { in: [...ids] },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
  }

  create(input: NewDeliverable) {
    return this.db.deliverable.create({
      data: input,
    });
  }

  updateStatus(
    id: string,
    status: DeliverableStatus,
    postedUrl?: string | null,
  ) {
    return this.db.deliverable.update({
      where: { id },
      data: {
        status,
        postedUrl,
      },
    });
  }
}