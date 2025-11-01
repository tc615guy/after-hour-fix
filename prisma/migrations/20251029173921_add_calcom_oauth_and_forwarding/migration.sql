-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "calcomBookingId" INTEGER,
ADD COLUMN     "calcomBookingUid" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "calcomAccessToken" TEXT,
ADD COLUMN     "calcomConnectedAt" TIMESTAMP(3),
ADD COLUMN     "calcomEventTypeId" INTEGER,
ADD COLUMN     "calcomRefreshToken" TEXT,
ADD COLUMN     "calcomTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "calcomUserId" INTEGER,
ADD COLUMN     "forwardingConditions" JSONB,
ADD COLUMN     "forwardingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forwardingNumber" TEXT,
ADD COLUMN     "forwardingType" TEXT NOT NULL DEFAULT 'overflow';
