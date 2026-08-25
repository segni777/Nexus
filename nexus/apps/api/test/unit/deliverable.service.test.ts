import { mock, type MockProxy } from 'jest-mock-extended';
import type { CampaignRepository } from '../../src/repositories/campaign.repository.js';
import type { DeliverableRepository } from '../../src/repositories/deliverable.repository.js';
import { DeliverableService } from '../../src/services/deliverable.service.js';

const campaign = {
  id: 'campaign-1',
  brandId: 'brand-1',
  name: 'Campaign',
  budgetCents: 100_000,
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-02-01T00:00:00Z'),
  status: 'ACTIVE' as const,
};

const newDeliverable = {
  campaignId: campaign.id,
  creatorId: 'creator-1',
  type: 'VIDEO' as const,
  dueDate: new Date('2026-01-15T00:00:00Z'),
};

const deliverable = {
  id: 'deliverable-1',
  ...newDeliverable,
  postedUrl: null,
  status: 'ASSIGNED' as const,
};

const assignment = {
  campaignId: campaign.id,
  creatorId: newDeliverable.creatorId,
  agreedRateCents: 5_000,
  role: 'PRIMARY' as const,
};

describe('DeliverableService', () => {
  let deliverables: MockProxy<DeliverableRepository>;
  let campaigns: MockProxy<CampaignRepository>;
  let service: DeliverableService;

  beforeEach(() => {
    deliverables = mock<DeliverableRepository>();
    campaigns = mock<CampaignRepository>();
    service = new DeliverableService(deliverables, campaigns);
  });

  it('requires the campaign to exist', async () => {
    campaigns.findById.mockResolvedValue(null);

    await expect(service.create(newDeliverable)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('requires a real campaign/creator assignment', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    campaigns.findAssignment.mockResolvedValue(null);

    await expect(service.create(newDeliverable)).rejects.toMatchObject({
      code: 'BAD_USER_INPUT',
    });
    expect(deliverables.create).not.toHaveBeenCalled();
  });

  it.each([
    ['before', new Date('2025-12-31T00:00:00Z')],
    ['after', new Date('2026-02-02T00:00:00Z')],
  ])('rejects a due date %s the campaign', async (_label, dueDate) => {
    campaigns.findById.mockResolvedValue(campaign);
    campaigns.findAssignment.mockResolvedValue(assignment);

    await expect(service.create({ ...newDeliverable, dueDate }))
      .rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it('creates an assigned deliverable within the campaign dates', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    campaigns.findAssignment.mockResolvedValue(assignment);
    deliverables.create.mockResolvedValue(deliverable);

    await expect(service.create(newDeliverable)).resolves.toBe(deliverable);
  });

  it('rejects an invalid ASSIGNED to POSTED transition', async () => {
    deliverables.findById.mockResolvedValue(deliverable);

    await expect(service.updateStatus({
      id: deliverable.id,
      status: 'POSTED',
      postedUrl: 'https://example.com/post',
    })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it.each([undefined, null, '', 'not-a-url', 'ftp://example.com/post'])(
    'requires a valid posted URL (%s)',
    async (postedUrl) => {
      deliverables.findById.mockResolvedValue({ ...deliverable, status: 'APPROVED' });

      await expect(service.updateStatus({
        id: deliverable.id,
        status: 'POSTED',
        postedUrl,
      })).rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
      expect(deliverables.updateStatus).not.toHaveBeenCalled();
    },
  );

  it('allows APPROVED to POSTED with an HTTPS URL', async () => {
    const approved = { ...deliverable, status: 'APPROVED' as const };
    const posted = {
      ...deliverable,
      status: 'POSTED' as const,
      postedUrl: 'https://example.com/post',
    };
    deliverables.findById.mockResolvedValue(approved);
    deliverables.updateStatus.mockResolvedValue(posted);

    await expect(service.updateStatus({
      id: deliverable.id,
      status: 'POSTED',
      postedUrl: posted.postedUrl,
    })).resolves.toBe(posted);
  });

  it('allows a non-posted transition without setting a URL', async () => {
    deliverables.findById.mockResolvedValue(deliverable);
    deliverables.updateStatus.mockResolvedValue({ ...deliverable, status: 'IN_REVIEW' });

    await service.updateStatus({ id: deliverable.id, status: 'IN_REVIEW' });
    expect(deliverables.updateStatus).toHaveBeenCalledWith(
      deliverable.id,
      'IN_REVIEW',
      undefined,
    );
  });

  it('returns without writing when the status is unchanged', async () => {
    deliverables.findById.mockResolvedValue(deliverable);

    await expect(service.updateStatus({ id: deliverable.id, status: 'ASSIGNED' }))
      .resolves.toBe(deliverable);
    expect(deliverables.updateStatus).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND for a missing deliverable', async () => {
    deliverables.findById.mockResolvedValue(null);

    await expect(service.get('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('normalizes list pagination and exposes batch reads', async () => {
    deliverables.list.mockResolvedValue({ items: [], totalCount: 0, offset: 0, limit: 20 });
    deliverables.findManyByCreatorIds.mockResolvedValue([deliverable]);

    await service.list({}, null);
    await expect(service.findManyByCreatorIds(['creator-1']))
      .resolves.toEqual([deliverable]);
  });
});
