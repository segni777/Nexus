import 'dotenv/config'; // WHY: Prisma 6 does NOT auto-load .env. Running this via
                        // `tsx prisma/seed.ts` (your `npm run seed`) without it leaves
                        // DATABASE_URL undefined. Harmless when `db:seed` already loaded it.
import { faker } from '@faker-js/faker';
import {
  PrismaClient,
  Platform,
  CreatorStatus,
  CampaignStatus,
  CampaignRole,
  DeliverableType,
  DeliverableStatus,
  InsightScope,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Knobs ───────────────────────────────────────────────────────────────────
// Tuned to clear the §7 floors with headroom. If db:verify complains, raise these.
const SEED = 42;                          // WHY: fixed PRNG seed -> identical data every run
const NUM_BRANDS = 14;                    // floor 10
const NUM_CREATORS = 80;                  // floor 50
const NUM_CAMPAIGNS = 22;                 // floor 15
const CREATORS_PER_CAMPAIGN = { min: 2, max: 6 };
const DELIVERABLES_PER_PAIR = { min: 1, max: 3 };
const NUM_INSIGHTS = 3;                   // §5: "seed with 2-3 fake rows"

// ─── Time anchor ─────────────────────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
const SIM_DAYS = 90;
// WHY a literal date, never `new Date()`: keeps the 90-day window (and every
// chart and date-based test) stable across machines and across calendar days.
const SIM_END = new Date('2026-01-15T00:00:00.000Z');
const SIM_START = new Date(SIM_END.getTime() - SIM_DAYS * DAY);

const INDUSTRIES = [
  'Beauty', 'Apparel', 'Fitness', 'Food & Beverage', 'Gaming',
  'Consumer Electronics', 'Travel', 'Home & Lifestyle', 'Fintech', 'Wellness',
];

async function main() {
  faker.seed(SEED); // MUST be before any faker call

  // Wipe in reverse-dependency order so the seed is re-runnable standalone.
  await prisma.insight.deleteMany();
  await prisma.metricsSnapshot.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.campaignCreator.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.creator.deleteMany();
  await prisma.brand.deleteMany();

  // ── Brands ────────────────────────────────────────────────────────────────
  const brands = Array.from({ length: NUM_BRANDS }, () => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    industry: faker.helpers.arrayElement(INDUSTRIES),
    contactEmail: faker.internet.email(),
  }));

  // ── Creators ──────────────────────────────────────────────────────────────
  const creators = Array.from({ length: NUM_CREATORS }, (_, i) => {
    const firstRaw = faker.person.firstName();
    const lastRaw = faker.person.lastName();
    // `i` suffix guarantees the @unique handle constraint holds.
    const handle =
      `${firstRaw}${lastRaw}`.toLowerCase().replace(/[^a-z]/g, '') + i;

    // Follower tiers, weighted toward micro/mid influencers.
    const [lo, hi] = faker.helpers.weightedArrayElement([
      { weight: 30, value: [1_000, 10_000] as const },     // nano
      { weight: 40, value: [10_000, 100_000] as const },    // micro
      { weight: 22, value: [100_000, 500_000] as const },   // mid
      { weight: 8, value: [500_000, 2_000_000] as const },  // macro
    ]);
    const followerCount = faker.number.int({ min: lo, max: hi });

    // engagement 1.2%-7.2%, expressed via int to dodge faker's float API churn.
    const engagementRate = faker.number.int({ min: 120, max: 720 }) / 10_000;

    // Rate correlates with reach: $8-$22 per 1k followers, floor $50. Stored as cents.
    const dollarsPer1k = faker.number.int({ min: 8, max: 22 });
    const ratePerPost = Math.max(
      5_000,
      Math.round((followerCount / 1_000) * dollarsPer1k * 100),
    );

    return {
      id: faker.string.uuid(),
      handle,
      displayName: `${firstRaw} ${lastRaw}`,
      primaryPlatform: faker.helpers.weightedArrayElement([
        { weight: 45, value: Platform.TIKTOK },
        { weight: 35, value: Platform.INSTAGRAM },
        { weight: 20, value: Platform.YOUTUBE },
      ]),
      followerCount,
      engagementRate,
      ratePerPost,
      status: faker.helpers.weightedArrayElement([
        { weight: 15, value: CreatorStatus.PROSPECT },
        { weight: 60, value: CreatorStatus.ACTIVE },
        { weight: 15, value: CreatorStatus.PAUSED },
        { weight: 10, value: CreatorStatus.CHURNED },
      ]),
      createdAt: faker.date.between({
        from: new Date(SIM_END.getTime() - 730 * DAY),
        to: SIM_END,
      }),
    };
  });

  // ── Campaigns ─────────────────────────────────────────────────────────────
  const campaigns = Array.from({ length: NUM_CAMPAIGNS }, () => {
    const brand = faker.helpers.arrayElement(brands);
    const start = faker.date.between({
      from: new Date(SIM_START.getTime() - 30 * DAY),
      to: SIM_END,
    });
    const end = new Date(start.getTime() + faker.number.int({ min: 14, max: 56 }) * DAY);

    // Status agrees with the dates so the Phase 3 board looks coherent.
    let status: CampaignStatus;
    if (faker.number.int({ min: 1, max: 100 }) <= 8) status = CampaignStatus.CANCELLED;
    else if (end < SIM_END) status = CampaignStatus.COMPLETED;
    else if (start > SIM_END) status = CampaignStatus.DRAFT;
    else status = CampaignStatus.ACTIVE;

    const season = faker.helpers.arrayElement([
      'Spring', 'Summer', 'Fall', 'Winter', 'Holiday', 'Back-to-School', 'Launch',
    ]);

    return {
      id: faker.string.uuid(),
      brandId: brand.id,
      name: `${season} ${faker.commerce.department()} — ${brand.name}`,
      budgetCents: faker.number.int({ min: 500_000, max: 20_000_000 }), // $5k-$200k
      startDate: start,
      endDate: end,
      status,
    };
  });

  // ── Campaign <-> Creator assignments ────────────────────────────────────────
  // Only active/paused creators get booked; prospects & churned don't.
  const bookable = creators.filter(
    (c) => c.status === CreatorStatus.ACTIVE || c.status === CreatorStatus.PAUSED,
  );

  const campaignCreators: Array<{
    campaignId: string; creatorId: string; agreedRateCents: number; role: CampaignRole;
  }> = [];

  for (const campaign of campaigns) {
    // arrayElements returns a UNIQUE subset -> no duplicate (campaignId, creatorId).
    const chosen = faker.helpers.arrayElements(
      bookable,
      faker.number.int(CREATORS_PER_CAMPAIGN),
    );
    for (const creator of chosen) {
      const jitter = faker.number.int({ min: 85, max: 115 }) / 100;
      campaignCreators.push({
        campaignId: campaign.id,
        creatorId: creator.id,
        agreedRateCents: Math.round(creator.ratePerPost * jitter),
        role: faker.helpers.weightedArrayElement([
          { weight: 20, value: CampaignRole.PRIMARY },
          { weight: 55, value: CampaignRole.SUPPORTING },
          { weight: 25, value: CampaignRole.AFFILIATE },
        ]),
      });
    }
  }

  // ── Deliverables + Metrics ──────────────────────────────────────────────────
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const creatorById = new Map(creators.map((c) => [c.id, c]));

  const TYPE_POOL: Record<Platform, DeliverableType[]> = {
    [Platform.TIKTOK]: [DeliverableType.VIDEO, DeliverableType.VIDEO, DeliverableType.STORY],
    [Platform.INSTAGRAM]: [DeliverableType.POST, DeliverableType.STORY, DeliverableType.VIDEO],
    [Platform.YOUTUBE]: [DeliverableType.VIDEO, DeliverableType.LIVESTREAM],
  };

  const deliverables: Array<{
    id: string; campaignId: string; creatorId: string; type: DeliverableType;
    dueDate: Date; postedUrl: string | null; status: DeliverableStatus;
  }> = [];
  const metrics: Array<{
    id: string; deliverableId: string; capturedAt: Date;
    views: number; likes: number; comments: number; shares: number; watchTimeSeconds: number;
  }> = [];

  for (const cc of campaignCreators) {
    const campaign = campaignById.get(cc.campaignId)!;
    const creator = creatorById.get(cc.creatorId)!;
    const n = faker.number.int(DELIVERABLES_PER_PAIR);

    for (let d = 0; d < n; d++) {
      const dueDate = faker.date.between({ from: campaign.startDate, to: campaign.endDate });
      const type = faker.helpers.arrayElement(TYPE_POOL[creator.primaryPlatform]);

      let status: DeliverableStatus;
      let postedUrl: string | null = null;

      if (dueDate < SIM_END) {
        const roll = faker.number.int({ min: 1, max: 100 });
        if (roll <= 70) {
          status = DeliverableStatus.POSTED;
          postedUrl = `${faker.internet.url()}/p/${faker.string.alphanumeric(8)}`;
        } else if (roll <= 85) {
          status = DeliverableStatus.APPROVED;
        } else {
          status = DeliverableStatus.OVERDUE; // past due, never posted
        }
      } else {
        status = faker.helpers.arrayElement([
          DeliverableStatus.ASSIGNED,
          DeliverableStatus.IN_REVIEW,
          DeliverableStatus.APPROVED,
        ]);
      }

      const deliverableId = faker.string.uuid();
      deliverables.push({
        id: deliverableId, campaignId: campaign.id, creatorId: creator.id,
        type, dueDate, postedUrl, status,
      });

      if (status !== DeliverableStatus.POSTED) continue;

      // ── Metrics time series (only for POSTED) ──
      const postedAt = new Date(dueDate.getTime() + faker.number.int({ min: 0, max: 2 }) * DAY);
      const windowMs = SIM_END.getTime() - postedAt.getTime();
      if (windowMs <= DAY) continue; // posted essentially at the sim's end -> no room for a curve

      const daysLive = Math.round(windowMs / DAY);
      const captures = Math.min(24, Math.max(6, Math.round(daysLive / 3))); // ~every 3 days

      // Draw the SHAPE once per deliverable so every field stays monotonic.
      const finalViews = Math.round(
        creator.followerCount * (faker.number.int({ min: 40, max: 180 }) / 100),
      );
      const k = faker.number.int({ min: 20, max: 45 }) / 10; // curve steepness 2.0-4.5
      const likeRatio = creator.engagementRate;
      const commentRatio = likeRatio * (faker.number.int({ min: 4, max: 10 }) / 100);
      const shareRatio = likeRatio * (faker.number.int({ min: 6, max: 16 }) / 100);
      const secsPerView = faker.number.int({ min: 4, max: 35 });

      for (let i = 1; i <= captures; i++) {
        const t = i / captures;                 // 0 < t <= 1
        const frac = 1 - Math.exp(-k * t);       // saturating growth, strictly increasing
        const views = Math.round(finalViews * frac);
        metrics.push({
          id: faker.string.uuid(),
          deliverableId,
          capturedAt: new Date(postedAt.getTime() + Math.round(windowMs * t)),
          views,
          likes: Math.round(views * likeRatio),
          comments: Math.round(views * commentRatio),
          shares: Math.round(views * shareRatio),
          watchTimeSeconds: views * secsPerView,
        });
      }
    }
  }

  // ── Insights (mock AI output; the real feature is Phase 7) ──────────────────
  const insights = Array.from({ length: NUM_INSIGHTS }, (_, i) => {
    const onCampaign = i % 2 === 0;
    const scopeId = onCampaign
      ? faker.helpers.arrayElement(campaigns).id
      : faker.helpers.arrayElement(creators).id;
    return {
      id: faker.string.uuid(),
      scope: onCampaign ? InsightScope.CAMPAIGN : InsightScope.CREATOR,
      scopeId,
      generatedAt: faker.date.between({ from: SIM_START, to: SIM_END }),
      model: faker.helpers.arrayElement(['claude-3-5-sonnet', 'gpt-4o-mini']),
      summaryText: faker.lorem.sentences(2),
      payloadJson: {
        sentiment: faker.helpers.arrayElement(['positive', 'neutral', 'mixed']),
        confidence: faker.number.int({ min: 60, max: 98 }) / 100,
        highlights: [faker.company.buzzPhrase(), faker.company.buzzPhrase()],
      },
    };
  });

  // ── Insert in dependency order ──────────────────────────────────────────────
  await prisma.brand.createMany({ data: brands });
  await prisma.creator.createMany({ data: creators });
  await prisma.campaign.createMany({ data: campaigns });
  await prisma.campaignCreator.createMany({ data: campaignCreators });
  await prisma.deliverable.createMany({ data: deliverables });
  await prisma.metricsSnapshot.createMany({ data: metrics });
  await prisma.insight.createMany({ data: insights });

  // ── Summary (so you can eyeball the volumes) ────────────────────────────────
  const posted = deliverables.filter((d) => d.status === DeliverableStatus.POSTED).length;
  console.log('Seed complete.');
  console.table({
    brands: brands.length,
    creators: creators.length,
    campaigns: campaigns.length,
    campaign_creators: campaignCreators.length,
    deliverables: deliverables.length,
    posted_deliverables: posted,
    metrics_snapshots: metrics.length,
    insights: insights.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());