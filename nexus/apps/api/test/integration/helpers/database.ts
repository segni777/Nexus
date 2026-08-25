import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient();

export async function resetTestDb() {
  await testDb.insight.deleteMany();
  await testDb.metricsSnapshot.deleteMany();
  await testDb.deliverable.deleteMany();
  await testDb.campaignCreator.deleteMany();
  await testDb.campaign.deleteMany();
  await testDb.creator.deleteMany();
  await testDb.brand.deleteMany();
}

export async function seedIntegrationFixture() {
  const brand = await testDb.brand.create({
    data: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Test Brand',
      industry: 'Testing',
      contactEmail: 'brand@example.com',
    },
  });
  const creator = await testDb.creator.create({
    data: {
      id: '20000000-0000-4000-8000-000000000001',
      handle: 'integration_creator',
      displayName: 'Integration Creator',
      primaryPlatform: 'TIKTOK',
      followerCount: 10_000,
      engagementRate: 0.05,
      ratePerPost: 50_000,
      status: 'ACTIVE',
    },
  });
  const campaign = await testDb.campaign.create({
    data: {
      id: '30000000-0000-4000-8000-000000000001',
      brandId: brand.id,
      name: 'Integration Campaign',
      budgetCents: 1_000_000,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-02-01T00:00:00Z'),
      status: 'ACTIVE',
    },
  });
  await testDb.campaignCreator.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      agreedRateCents: 50_000,
      role: 'PRIMARY',
    },
  });
  const deliverable = await testDb.deliverable.create({
    data: {
      id: '40000000-0000-4000-8000-000000000001',
      campaignId: campaign.id,
      creatorId: creator.id,
      type: 'VIDEO',
      dueDate: new Date('2026-01-15T00:00:00Z'),
      postedUrl: 'https://example.com/posts/1',
      status: 'POSTED',
    },
  });
  return { brand, creator, campaign, deliverable };
}