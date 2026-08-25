import type {
  Insight,
  InsightScope,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export interface InsightRepository {
  list(
    scope: InsightScope | null | undefined,
    scopeId: string | null | undefined,
    page: PageRequest,
  ): Promise<Page<Insight>>;
}

export class PrismaInsightRepository implements InsightRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(
    scope: InsightScope | null | undefined,
    scopeId: string | null | undefined,
    page: PageRequest,
  ): Promise<Page<Insight>> {
    const where: Prisma.InsightWhereInput = {
      scope: scope ?? undefined,
      scopeId: scopeId ?? undefined,
    };

    const [items, totalCount] = await Promise.all([
      this.db.insight.findMany({
        where,
        orderBy: [{ generatedAt: 'desc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.insight.count({ where }),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }
}