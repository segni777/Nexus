import type {
  Creator,
  CreatorStatus,
  Platform,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export type CreatorFilter = {
  status?: CreatorStatus | null;
  platform?: Platform | null;
};

export type NewCreator = {
  handle: string;
  displayName: string;
  primaryPlatform: Platform;
  followerCount: number;
  engagementRate: number;
  ratePerPost: number;
};

export interface CreatorRepository {
  findById(id: string): Promise<Creator | null>;
  findByHandle(handle: string): Promise<Creator | null>;
  findManyByIds(ids: readonly string[]): Promise<Creator[]>;
  list(filter: CreatorFilter, page: PageRequest): Promise<Page<Creator>>;
  create(input: NewCreator): Promise<Creator>;
  updateStatus(id: string, status: CreatorStatus): Promise<Creator>;
}

export class PrismaCreatorRepository implements CreatorRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.creator.findUnique({ where: { id } });
  }

  findByHandle(handle: string) {
    return this.db.creator.findUnique({ where: { handle } });
  }

  findManyByIds(ids: readonly string[]) {
    return this.db.creator.findMany({ where: { id: { in: [...ids] } } });
  }

  async list(filter: CreatorFilter, page: PageRequest): Promise<Page<Creator>> {
    const where: Prisma.CreatorWhereInput = {
      status: filter.status ?? undefined,
      primaryPlatform: filter.platform ?? undefined,
    };

    const [items, totalCount] = await Promise.all([
      this.db.creator.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.creator.count({ where }),
    ]);

    return { ...page, items, totalCount };
  }

  create(input: NewCreator) {
    return this.db.creator.create({ data: input });
  }

  updateStatus(id: string, status: CreatorStatus) {
    return this.db.creator.update({ where: { id }, data: { status } });
  }
}