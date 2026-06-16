-- AlterTable
ALTER TABLE "AppPlan" ADD COLUMN     "annualAmount" INTEGER,
ADD COLUMN     "notifyLimit" INTEGER,
ADD COLUMN     "preorderLimit" INTEGER;

-- AlterTable
ALTER TABLE "Installation" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "lastChargeAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;
