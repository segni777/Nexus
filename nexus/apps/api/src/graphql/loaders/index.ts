import DataLoader from 'dataloader';
import type { Brand, Campaign, Creator, Deliverable } from '@prisma/client';
import type { Services } from '../../services/index.js';

function orderByKey<T extends { id: string }>(
  keys: readonly string[],
  rows: readonly T[],
  entity: string,
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return keys.map((key) => byId.get(key) ?? new Error(`${entity} ${key} was not found`));
}

export function createLoaders(services: Services) {
  return {
    brandById: new DataLoader<string, Brand>(async (ids) =>
      orderByKey(ids, await services.brands.findManyByIds(ids), 'Brand'),
    ),
    campaignById: new DataLoader<string, Campaign>(async (ids) =>
      orderByKey(ids, await services.campaigns.findManyByIds(ids), 'Campaign'),
    ),
    creatorById: new DataLoader<string, Creator>(async (ids) =>
      orderByKey(ids, await services.creators.findManyByIds(ids), 'Creator'),
    ),
    deliverablesByCreatorId: new DataLoader<string, Deliverable[]>(async (creatorIds) => {
      const rows = await services.deliverables.findManyByCreatorIds(creatorIds);
      const grouped = new Map<string, Deliverable[]>();
      for (const row of rows) {
        const group = grouped.get(row.creatorId) ?? [];
        group.push(row);
        grouped.set(row.creatorId, group);
      }
      return creatorIds.map((id) => grouped.get(id) ?? []);
    }),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;