import 'dotenv/config'; // WHY: this runs via `tsx prisma/verify.ts` — never through the Prisma
                        // CLI — so on Prisma 6 nothing else loads .env. Omit it and PrismaClient
                        // throws "environment variable not found: DATABASE_URL" before any check runs.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const check = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });

async function main() {
  const [creators, brands, campaigns, deliverables, snapshots, insights] = await Promise.all([
    prisma.creator.count(),
    prisma.brand.count(),
    prisma.campaign.count(),
    prisma.deliverable.count(),
    prisma.metricsSnapshot.count(),
    prisma.insight.count(),
  ]);

  // §7 volume floors
  check('>= 50 creators', creators >= 50, `${creators}`);
  check('>= 10 brands', brands >= 10, `${brands}`);
  check('>= 15 campaigns', campaigns >= 15, `${campaigns}`);
  check('>= 100 deliverables', deliverables >= 100, `${deliverables}`);
  check('>= 1000 metrics snapshots', snapshots >= 1000, `${snapshots}`);
  check('>= 2 insights', insights >= 2, `${insights}`);

  // Business invariant a FK can't express: a deliverable's creator must actually
  // be booked on that campaign (the COMPOSITE campaignId+creatorId must exist).
  const pairs = new Set(
    (await prisma.campaignCreator.findMany({ select: { campaignId: true, creatorId: true } }))
      .map((p) => `${p.campaignId}:${p.creatorId}`),
  );
  const dels = await prisma.deliverable.findMany({ select: { campaignId: true, creatorId: true } });
  const orphaned = dels.filter((d) => !pairs.has(`${d.campaignId}:${d.creatorId}`)).length;
  check('every deliverable maps to a real campaign_creator', orphaned === 0, `${orphaned} orphaned`);

  // Metrics only hang off POSTED deliverables.
  const stray = await prisma.metricsSnapshot.count({
    where: { deliverable: { status: { not: 'POSTED' } } },
  });
  check('metrics only on POSTED deliverables', stray === 0, `${stray} stray`);

  // Each deliverable's view count never decreases over time (so charts read as growth).
  const ordered = await prisma.metricsSnapshot.findMany({
    orderBy: [{ deliverableId: 'asc' }, { capturedAt: 'asc' }],
    select: { deliverableId: true, views: true },
  });
  let regressions = 0;
  let prevId = '';
  let prevViews = -1;
  for (const s of ordered) {
    if (s.deliverableId !== prevId) { prevId = s.deliverableId; prevViews = -1; }
    if (s.views < prevViews) regressions++;
    prevViews = s.views;
  }
  check('views never decrease within a deliverable', regressions === 0, `${regressions} regressions`);

  // Metrics really do stretch across the simulated window.
  const span = await prisma.metricsSnapshot.aggregate({
    _min: { capturedAt: true }, _max: { capturedAt: true },
  });
  const spanDays = span._min.capturedAt && span._max.capturedAt
    ? Math.round((+span._max.capturedAt - +span._min.capturedAt) / 86_400_000)
    : 0;
  check('metrics span >= 60 days', spanDays >= 60, `${spanDays} days`);

  // Report + exit code (so CI can gate on it in Phase 4).
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
  console.log('\nPhase 1 seed verification\n' + '-'.repeat(56));
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${pad(c.name, 44)} ${c.detail}`);
  const failed = checks.filter((c) => !c.pass).length;
  console.log('-'.repeat(56));
  console.log(failed === 0 ? 'All checks passed.\n' : `${failed} check(s) failed.\n`);

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});