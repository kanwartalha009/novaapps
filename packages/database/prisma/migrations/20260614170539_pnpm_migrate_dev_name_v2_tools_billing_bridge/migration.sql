/*
  Warnings:

  - You are about to drop the column `appSlug` on the `WebhookEvent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CommissionModel" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('APP', 'TOOL');

-- CreateEnum
CREATE TYPE "WebhookSource" AS ENUM ('SHOPIFY_APP', 'STRIPE', 'STORE_BRIDGE');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('AGENCY', 'STORE', 'HYBRID');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'OPEN', 'UNCOLLECTIBLE', 'VOID');

-- CreateEnum
CREATE TYPE "BridgeConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ToolActivationSource" AS ENUM ('GRANT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ToolActivationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EntitlementReason" AS ENUM ('GRANT', 'TRIAL', 'SUBSCRIPTION', 'FREEMIUM', 'NONE');

-- CreateEnum
CREATE TYPE "AvailabilityMode" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "AvailabilityEffect" AS ENUM ('ALLOW', 'DENY');

-- DropIndex
DROP INDEX "WebhookEvent_appSlug_topic_idx";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "commissionModel" "CommissionModel",
ADD COLUMN     "flatAmount" INTEGER,
ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "AgencyApp" ADD COLUMN     "commissionModel" "CommissionModel",
ADD COLUMN     "flatAmount" INTEGER;

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "latestVersion" TEXT,
ADD COLUMN     "moduleManifest" JSONB,
ADD COLUMN     "publishChecklist" JSONB,
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "shopifyClientId" TEXT,
ADD COLUMN     "spec" JSONB;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "commissionModel" "CommissionModel" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "flatAmount" INTEGER;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "grantedScopes" TEXT[],
ADD COLUMN     "tokenRotatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WebhookEvent" DROP COLUMN "appSlug",
ADD COLUMN     "productSlug" TEXT,
ADD COLUMN     "productType" "ProductType",
ADD COLUMN     "source" "WebhookSource" NOT NULL DEFAULT 'SHOPIFY_APP',
ALTER COLUMN "shopDomain" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "toolType" "ToolType" NOT NULL DEFAULT 'AGENCY',
    "usesStoreBridge" BOOLEAN NOT NULL DEFAULT false,
    "requiredScopes" TEXT[],
    "repoUrl" TEXT,
    "moduleManifest" JSONB,
    "latestVersion" TEXT,
    "releaseChecklist" JSONB,
    "spec" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolPlan" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" "PricingModel" NOT NULL DEFAULT 'FREEMIUM',
    "baseAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" "PlanInterval" NOT NULL DEFAULT 'EVERY_30_DAYS',
    "trialDays" INTEGER NOT NULL DEFAULT 7,
    "perStore" BOOLEAN NOT NULL DEFAULT false,
    "perStoreAmount" INTEGER,
    "meteredConfig" JSONB,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ToolPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meter" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unitLabel" TEXT,
    "stripeMeterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolPlanId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeMeterEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBridgeConnection" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "grantedScopes" TEXT[],
    "status" "BridgeConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "StoreBridgeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolActivation" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "source" "ToolActivationSource" NOT NULL,
    "status" "ToolActivationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "access" BOOLEAN NOT NULL DEFAULT false,
    "reason" "EntitlementReason" NOT NULL DEFAULT 'NONE',
    "quota" JSONB,
    "expiresAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "productId" TEXT NOT NULL,
    "mode" "AvailabilityMode" NOT NULL DEFAULT 'PRIVATE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityEntry" (
    "id" TEXT NOT NULL,
    "availabilityId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "effect" "AvailabilityEffect" NOT NULL,

    CONSTRAINT "AvailabilityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ToolPlan_toolId_name_key" ON "ToolPlan"("toolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Meter_toolId_key_key" ON "Meter"("toolId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_agencyId_status_idx" ON "Subscription"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_agencyId_toolId_key" ON "Subscription"("agencyId", "toolId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_agencyId_idx" ON "Invoice"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_stripeMeterEventId_key" ON "UsageRecord"("stripeMeterEventId");

-- CreateIndex
CREATE INDEX "UsageRecord_subscriptionId_meterId_idx" ON "UsageRecord"("subscriptionId", "meterId");

-- CreateIndex
CREATE INDEX "StoreBridgeConnection_storeId_idx" ON "StoreBridgeConnection"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBridgeConnection_toolId_storeId_key" ON "StoreBridgeConnection"("toolId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolActivation_toolId_agencyId_key" ON "ToolActivation"("toolId", "agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_agencyId_toolId_key" ON "Entitlement"("agencyId", "toolId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_productType_productId_key" ON "Availability"("productType", "productId");

-- CreateIndex
CREATE INDEX "AvailabilityEntry_agencyId_idx" ON "AvailabilityEntry"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityEntry_availabilityId_agencyId_key" ON "AvailabilityEntry"("availabilityId", "agencyId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_source_topic_idx" ON "WebhookEvent"("source", "topic");

-- CreateIndex
CREATE INDEX "WebhookEvent_productType_productSlug_idx" ON "WebhookEvent"("productType", "productSlug");

-- AddForeignKey
ALTER TABLE "ToolPlan" ADD CONSTRAINT "ToolPlan_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_toolPlanId_fkey" FOREIGN KEY ("toolPlanId") REFERENCES "ToolPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBridgeConnection" ADD CONSTRAINT "StoreBridgeConnection_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreBridgeConnection" ADD CONSTRAINT "StoreBridgeConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolActivation" ADD CONSTRAINT "ToolActivation_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolActivation" ADD CONSTRAINT "ToolActivation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityEntry" ADD CONSTRAINT "AvailabilityEntry_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "Availability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
