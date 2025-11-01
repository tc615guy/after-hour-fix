/*
  Warnings:

  - You are about to drop the column `forwardingConditions` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `forwardingType` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "costSheetSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "technicianId" TEXT;

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PhoneNumber" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "forwardingConditions",
DROP COLUMN "forwardingType",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "allowOverage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowWeekendBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emergencyMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "holidays" JSONB,
ADD COLUMN     "membershipActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minutesAlert100Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minutesAlert80Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationsEmail" TEXT,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'Starter',
ADD COLUMN     "pricingSheet" JSONB,
ADD COLUMN     "requireOnCallForWeekend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceArea" JSONB,
ADD COLUMN     "serviceRadius" INTEGER,
ALTER COLUMN "forwardingEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOnCall" BOOLEAN NOT NULL DEFAULT false,
    "onCallSchedule" JSONB,
    "emergencyOnly" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "projectId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "total" INTEGER,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Technician_projectId_idx" ON "Technician"("projectId");

-- CreateIndex
CREATE INDEX "Technician_projectId_isOnCall_priority_idx" ON "Technician"("projectId", "isOnCall", "priority");

-- CreateIndex
CREATE INDEX "FeatureFlag_projectId_idx" ON "FeatureFlag"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_projectId_key" ON "FeatureFlag"("key", "projectId");

-- CreateIndex
CREATE INDEX "ImportJob_projectId_createdAt_idx" ON "ImportJob"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Agent_projectId_idx" ON "Agent"("projectId");

-- CreateIndex
CREATE INDEX "Booking_projectId_idx" ON "Booking"("projectId");

-- CreateIndex
CREATE INDEX "Booking_projectId_slotStart_idx" ON "Booking"("projectId", "slotStart");

-- CreateIndex
CREATE INDEX "Booking_projectId_createdAt_idx" ON "Booking"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Call_projectId_createdAt_idx" ON "Call"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_projectId_createdAt_idx" ON "EventLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneNumber_projectId_idx" ON "PhoneNumber"("projectId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
