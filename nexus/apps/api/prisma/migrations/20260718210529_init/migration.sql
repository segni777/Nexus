-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TIKTOK', 'INSTAGRAM', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "CreatorStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'PAUSED', 'CHURNED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableType" AS ENUM ('VIDEO', 'POST', 'STORY', 'LIVESTREAM');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('ASSIGNED', 'IN_REVIEW', 'APPROVED', 'POSTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InsightScope" AS ENUM ('CREATOR', 'CAMPAIGN');

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "primaryPlatform" "Platform" NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,
    "ratePerPost" INTEGER NOT NULL,
    "status" "CreatorStatus" NOT NULL DEFAULT 'PROSPECT',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_creators" (
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "agreedRateCents" INTEGER NOT NULL,

    CONSTRAINT "campaign_creators_pkey" PRIMARY KEY ("campaignId","creatorId")
);

-- CreateTable
CREATE TABLE "deliverables" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "DeliverableType" NOT NULL,
    "dueDate" TIMESTAMPTZ NOT NULL,
    "postedUrl" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'ASSIGNED',

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_snapshots" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "capturedAt" TIMESTAMPTZ NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "watchTimeSeconds" INTEGER NOT NULL,

    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "scope" "InsightScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "summaryText" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creators_handle_key" ON "creators"("handle");

-- CreateIndex
CREATE INDEX "creators_status_idx" ON "creators"("status");

-- CreateIndex
CREATE INDEX "campaigns_brandId_idx" ON "campaigns"("brandId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_creators_creatorId_idx" ON "campaign_creators"("creatorId");

-- CreateIndex
CREATE INDEX "deliverables_campaignId_idx" ON "deliverables"("campaignId");

-- CreateIndex
CREATE INDEX "deliverables_creatorId_idx" ON "deliverables"("creatorId");

-- CreateIndex
CREATE INDEX "metrics_snapshots_deliverableId_capturedAt_idx" ON "metrics_snapshots"("deliverableId", "capturedAt");

-- CreateIndex
CREATE INDEX "insights_scope_scopeId_idx" ON "insights"("scope", "scopeId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics_snapshots" ADD CONSTRAINT "metrics_snapshots_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
