import type { InsightScope } from '@prisma/client';
import type { InsightRepository } from '../repositories/insight.repository.js';
import {
  normalizePage,
  type PageRequest,
} from '../repositories/page.js';

export class InsightService {
  constructor(
    private readonly insights: InsightRepository,
  ) {}

  list(
    scope?: InsightScope | null,
    scopeId?: string | null,
    page?: Partial<PageRequest> | null,
  ) {
    return this.insights.list(
      scope,
      scopeId,
      normalizePage(page),
    );
  }
}