import { mock, type MockProxy } from 'jest-mock-extended';
import type { BrandRepository } from '../../src/repositories/brand.repository.js';
import type { CampaignRepository } from '../../src/repositories/campaign.repository.js';
import type { CreatorRepository } from '../../src/repositories/creator.repository.js';
import { CampaignService } from '../../src/services/campaign.service.js';

const brand = {
  id: 'brand-1',
  name: 'Brand',
  industry: 'Retail',
  contactEmail: 'brand@example.com',
};

const creator = {
  id: 'creator-1',
  handle: 'sample',
  displayName: 'Sample Creator',
  primaryPlatform: 'TIKTOK' as const,
  followerCount: 1_000,
  engagementRate: 0.05,
  ratePerPost: 5_000,
  status: 'ACTIVE' as const,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const campaign = {
  id: 'campaign-1',
  brandId: brand.id,
  name: 'Campaign',
  budgetCents: 100_000,
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: new Date('2026-02-01T00:00:00Z'),
  status: 'DRAFT' as const,
};

const newCampaign = {
  brandId: brand.id,
  name: 'Campaign',
  budgetCents: 100_000,
  startDate: campaign.startDate,
  endDate: campaign.endDate,
};

const assignment = {
  campaignId: campaign.id,
  creatorId: creator.id,
  agreedRateCents: 5_000,
  role: 'PRIMARY' as const,
};

describe('CampaignService', () => {
  let campaigns: MockProxy<CampaignRepository>;
  let brands: MockProxy<BrandRepository>;
  let creators: MockProxy<CreatorRepository>;
  let service: CampaignService;

  beforeEach(() => {
    campaigns = mock<CampaignRepository>();
    brands = mock<BrandRepository>();
    creators = mock<CreatorRepository>();
    service = new CampaignService(campaigns, brands, creators);
  });

  it('rejects a non-positive budget', async () => {
    await expect(service.create({ ...newCampaign, budgetCents: 0 }))
      .rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(campaigns.create).not.toHaveBeenCalled();
  });

  it.each([
    ['equal dates', campaign.startDate],
    ['an end date before the start', new Date('2025-12-31T00:00:00Z')],
  ])('rejects %s', async (_label, endDate) => {
    await expect(service.create({ ...newCampaign, endDate }))
      .rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(campaigns.create).not.toHaveBeenCalled();
  });

  it('requires the brand to exist', async () => {
    brands.findById.mockResolvedValue(null);

    await expect(service.create(newCampaign)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('creates a valid draft campaign', async () => {
    brands.findById.mockResolvedValue(brand);
    campaigns.create.mockResolvedValue(campaign);

    await expect(service.create(newCampaign)).resolves.toBe(campaign);
    expect(campaigns.create).toHaveBeenCalledWith(newCampaign);
  });

  it('allows DRAFT to ACTIVE and rejects DRAFT to COMPLETED', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    campaigns.updateStatus.mockResolvedValue({ ...campaign, status: 'ACTIVE' });

    await expect(service.updateStatus(campaign.id, 'ACTIVE')).resolves.toMatchObject({
      status: 'ACTIVE',
    });
    await expect(service.updateStatus(campaign.id, 'COMPLETED'))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('treats an unchanged status as an idempotent update', async () => {
    campaigns.findById.mockResolvedValue(campaign);

    await expect(service.updateStatus(campaign.id, 'DRAFT')).resolves.toBe(campaign);
  });

  it('rejects duplicate campaign assignments', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    creators.findById.mockResolvedValue(creator);
    campaigns.findAssignment.mockResolvedValue(assignment);

    await expect(service.assignCreator(assignment)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect(campaigns.createAssignment).not.toHaveBeenCalled();
  });

  it('rejects non-positive assignment rates', async () => {
    await expect(service.assignCreator({ ...assignment, agreedRateCents: 0 }))
      .rejects.toMatchObject({ code: 'BAD_USER_INPUT' });
  });

  it.each(['COMPLETED', 'CANCELLED'] as const)(
    'rejects assignments to %s campaigns',
    async (status) => {
      campaigns.findById.mockResolvedValue({ ...campaign, status });

      await expect(service.assignCreator(assignment)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    },
  );

  it('requires the assigned creator to exist', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    creators.findById.mockResolvedValue(null);

    await expect(service.assignCreator(assignment)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('creates a valid assignment', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    creators.findById.mockResolvedValue(creator);
    campaigns.findAssignment.mockResolvedValue(null);
    campaigns.createAssignment.mockResolvedValue(assignment);

    await expect(service.assignCreator(assignment)).resolves.toBe(assignment);
  });

  it('throws NOT_FOUND for a missing campaign', async () => {
    campaigns.findById.mockResolvedValue(null);

    await expect(service.get('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('normalizes list and assignment pagination and exposes batch reads', async () => {
    campaigns.findById.mockResolvedValue(campaign);
    campaigns.list.mockResolvedValue({ items: [], totalCount: 0, offset: 0, limit: 20 });
    campaigns.listAssignments.mockResolvedValue({ items: [], totalCount: 0, offset: 0, limit: 20 });
    campaigns.findManyByIds.mockResolvedValue([campaign]);

    await service.list({}, null);
    await service.listAssignments(campaign.id, null);
    await expect(service.findManyByIds([campaign.id])).resolves.toEqual([campaign]);

    expect(campaigns.list).toHaveBeenCalledWith({}, { offset: 0, limit: 20 });
    expect(campaigns.listAssignments).toHaveBeenCalledWith(campaign.id, { offset: 0, limit: 20 });
  });
});
