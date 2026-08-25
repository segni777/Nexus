export type PageRequest = { offset: number; limit: number };

export type Page<T> = PageRequest & {
  items: T[];
  totalCount: number;
};

export function normalizePage(input?: Partial<PageRequest> | null): PageRequest {
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.min(50, Math.max(1, input?.limit ?? 20));
  return { offset, limit };
}