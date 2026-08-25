import { mock, type MockProxy } from 'jest-mock-extended';
import type { BrandRepository } from '../../src/repositories/brand.repository.js';
import type { DeliverableRepository } from '../../src/repositories/deliverable.repository.js';
import type { InsightRepository } from '../../src/repositories/insight.repository.js';
import type { MetricsRepository } from '../../src/repositories/metrics.repository.js';
import { BrandService } from '../../src/services/brand.service.js';
import { InsightService } from '../../src/services/insight.service.js';
import { MetricsService } from '../../src/services/metrics.service.js';

const postedDeliverable = {
  id: 'deliverable-1',
  campaignId: 'campaign-1',
  creatorId: 'creator-1',
  type: 'VIDEO' as const,
  dueDate: new Date('2026-01-15T00:00:00Z'),
  postedUrl: 'https://example.com/post',
  status: 'POSTED' as const,
};

const snapshot = {
  id: 'snapshot-1',
  deliverableId: postedDeliverable.id,
  capturedAt: new Date('2026-01-20T00:00:00Z'),
  views: 100,
  likes: 20,
  comments: 5,
  shares: 3,
  watchTimeSeconds: 500,
};

const newSnapshot = {
  deliverableId: snapshot.deliverableId,
  capturedAt: new Date('2026-01-21T00:00:00Z'),
  views: snapshot.views,
  likes: snapshot.likes,
  comments: snapshot.comments,
  shares: snapshot.shares,
  watchTimeSeconds: snapshot.watchTimeSeconds,
};

describe('MetricsService', () => {
  let metrics: MockProxy<MetricsRepository>;
  let deliverables: MockProxy<DeliverableRepository>;
  let service: MetricsService;

  beforeEach(() => {
    metrics = mock<MetricsRepository>();
    deliverables = mock<DeliverableRepository>();
    service = new MetricsService(metrics, deliverables);
  });

  it('rejects a missing deliverable', async () => {
    deliverables.findById.mockResolvedValue(null);

    await expect(service.record(newSnapshot)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('rejects metrics for a non-posted deliverable', async () => {
    deliverables.findById.mockResolvedValue({
      ...postedDeliverable,
      status: 'APPROVED',
    });

    await expect(service.record(newSnapshot)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(metrics.create).not.toHaveBeenCalled();
  });

  it.each([
    ['views', -1],
    ['likes', 1.5],
    ['comments', -1],
    ['shares', -1],
    ['watchTimeSeconds', -1],
  ] as const)('rejects invalid %s', async (field, value) => {
    deliverables.findById.mockResolvedValue(postedDeliverable);

    await expect(service.record({ ...newSnapshot, [field]: value }))
      .rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(metrics.create).not.toHaveBeenCalled();
  });

  it.each([
    'views',
    'likes',
    'comments',
    'shares',
    'watchTimeSeconds',
  ] as const)('rejects decreasing %s', async (field) => {
    deliverables.findById.mockResolvedValue(postedDeliverable);
    metrics.findLatestForDeliverable.mockResolvedValue(snapshot);

    await expect(service.record({
      ...newSnapshot,
      [field]: snapshot[field] - 1,
    })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(metrics.create).not.toHaveBeenCalled();
  });

  it('creates a valid first snapshot', async () => {
    deliverables.findById.mockResolvedValue(postedDeliverable);
    metrics.findLatestForDeliverable.mockResolvedValue(null);
    metrics.create.mockResolvedValue(snapshot);

    await expect(service.record(newSnapshot)).resolves.toBe(snapshot);
  });

  it('allows metrics equal to the latest cumulative values', async () => {
    deliverables.findById.mockResolvedValue(postedDeliverable);
    metrics.findLatestForDeliverable.mockResolvedValue(snapshot);
    metrics.create.mockResolvedValue(snapshot);

    await expect(service.record(newSnapshot)).resolves.toBe(snapshot);
  });

  it('normalizes list pagination', async () => {
    metrics.listForDeliverable.mockResolvedValue({
      items: [], totalCount: 0, offset: 0, limit: 20,
    });

    await service.list(postedDeliverable.id, null);
    expect(metrics.listForDeliverable).toHaveBeenCalledWith(
      postedDeliverable.id,
      { offset: 0, limit: 20 },
    );
  });
});

describe('read services', () => {
  it('throws NOT_FOUND for a missing brand and supports valid reads', async () => {
    const repository = mock<BrandRepository>();
    const service = new BrandService(repository);
    const brand = {
      id: 'brand-1', name: 'Brand', industry: 'Retail', contactEmail: 'brand@example.com',
    };
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(brand);
    repository.list.mockResolvedValue({ items: [brand], totalCount: 1, offset: 0, limit: 20 });
    repository.findManyByIds.mockResolvedValue([brand]);

    await expect(service.get('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(service.get(brand.id)).resolves.toBe(brand);
    await service.list(null);
    await expect(service.findManyByIds([brand.id])).resolves.toEqual([brand]);
  });

  it('forwards normalized insight filters and pagination', async () => {
    const repository = mock<InsightRepository>();
    const service = new InsightService(repository);
    repository.list.mockResolvedValue({ items: [], totalCount: 0, offset: 5, limit: 10 });

    await service.list('CREATOR', 'creator-1', { offset: 5, limit: 10 });
    expect(repository.list).toHaveBeenCalledWith(
      'CREATOR',
      'creator-1',
      { offset: 5, limit: 10 },
    );
  });
});
