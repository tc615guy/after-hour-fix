-- Migration: Add call recording and confidence fields
-- Run this manually or via: npx prisma migrate dev --name add_call_recording_fields

-- Add new columns to Call table
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "escalated" BOOLEAN DEFAULT false;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN DEFAULT false;

-- Create index for demo calls query
CREATE INDEX IF NOT EXISTS "Call_isDemo_idx" ON "Call"("isDemo");

-- Update existing calls to have default values
UPDATE "Call" SET "confidence" = 1.0 WHERE "confidence" IS NULL;
UPDATE "Call" SET "escalated" = false WHERE "escalated" IS NULL;
UPDATE "Call" SET "isDemo" = false WHERE "isDemo" IS NULL;
