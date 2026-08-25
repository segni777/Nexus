import { NotFoundError } from '../errors/app-error.js';
import type { BrandRepository } from '../repositories/brand.repository.js';
import {
  normalizePage,
  type PageRequest,
} from '../repositories/page.js';

export class BrandService {
  constructor(
    private readonly brands: BrandRepository,
  ) {}

  list(page?: Partial<PageRequest> | null) {
    return this.brands.list(normalizePage(page));
  }

  async get(id: string) {
    const brand = await this.brands.findById(id);

    if (!brand) {
      throw new NotFoundError('Brand', id);
    }

    return brand;
  }

  findManyByIds(ids: readonly string[]) {
    return this.brands.findManyByIds(ids);
  }
}