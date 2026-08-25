import type { Brand, PrismaClient } from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export interface BrandRepository {
  findById(id: string): Promise<Brand | null>;
  findManyByIds(ids: readonly string[]): Promise<Brand[]>;
  list(page: PageRequest): Promise<Page<Brand>>;
}

export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.brand.findUnique({
      where: { id },
    });
  }

  findManyByIds(ids: readonly string[]) {
    return this.db.brand.findMany({
      where: {
        id: { in: [...ids] },
      },
    });
  }

  async list(page: PageRequest): Promise<Page<Brand>> {
    const [items, totalCount] = await Promise.all([
      this.db.brand.findMany({
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.brand.count(),
    ]);

    return {
      ...page,
      items,
      totalCount,
    };
  }
}