import type {
  MetricsSnapshot,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export type NewMetricsSnapshot = {
  deliverableId: string;
  capturedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSeconds: number;
};

export interface MetricsRepository {
  listForDeliverable(
    deliverableId: string,
    page: PageRequest,
  ): Promise<Page<MetricsSnapshot>>;
  findLatestForDeliverable(
    deliverableId: string,
  ): Promise<MetricsSnapshot | null>;
  create(input: NewMetricsSnapshot): Promise<MetricsSnapshot>;
}

export class PrismaMetricsRepository implements MetricsRepository {
  constructor(private readonly db: PrismaClient) {}

  async listForDeliverable(
    deliverableId: string,
    page: PageRequest,
  ): Promise<Page<MetricsSnapshot>> {
    const where = { deliverableId };

    const [items, totalCount] = await Promise.all([
      this.db.metricsSnapshot.findMany({
        where,
        orderBy: [{ capturedAt: 'desc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.metricsSnapshot.count({ where }),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }

  findLatestForDeliverable(deliverableId: string) {
    return this.db.metricsSnapshot.findFirst({
      where: { deliverableId },
      orderBy: [{ capturedAt: 'desc' }, { id: 'desc' }],
    });
  }

  create(input: NewMetricsSnapshot) {
    return this.db.metricsSnapshot.create({
      data: input,
    });
  }
}