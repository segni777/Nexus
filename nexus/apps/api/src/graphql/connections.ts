import type { Page } from '../repositories/page.js';

export function toConnection<T>(page: Page<T>) {
  return {
    items: page.items,
    pageInfo: {
      offset: page.offset,
      limit: page.limit,
      totalCount: page.totalCount,
      hasNextPage: page.offset + page.items.length < page.totalCount,
    },
  };
}

export function pageRows<T>(rows: T[], offset: number, limit: number): Page<T> {
  return {
    items: rows.slice(offset, offset + limit),
    totalCount: rows.length,
    offset,
    limit,
  };
}