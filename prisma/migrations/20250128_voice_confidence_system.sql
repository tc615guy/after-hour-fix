-- Migration: Add voice confidence and demo recording system
-- Run via: npx prisma migrate dev --name voice_confidence_system

-- Add columns to Project table
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ownerPhone" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "confidenceThreshold" DOUBLE PRECISION DEFAULT 0.65;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "autoForwardEnabled" BOOLEAN DEFAULT true;

-- Add columns to Agent table
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "demoRecordingUrl" TEXT;

-- Add columns to Call table
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "voiceConfidence" DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE "Call" ADD COLUMN IF NOT EXISTS "escalationReason" TEXT;

-- Rename confidence to voiceConfidence if old column exists
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns
            WHERE table_name='Call' AND column_name='confidence') THEN
    ALTER TABLE "Call" RENAME COLUMN "confidence" TO "voiceConfidence";
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "Call_voiceConfidence_idx" ON "Call"("voiceConfidence");
CREATE INDEX IF NOT EXISTS "Call_escalated_idx" ON "Call"("escalated");
CREATE INDEX IF NOT EXISTS "Call_isDemo_idx" ON "Call"("isDemo");

-- Update existing records with defaults
UPDATE "Project" SET "confidenceThreshold" = 0.65 WHERE "confidenceThreshold" IS NULL;
UPDATE "Project" SET "autoForwardEnabled" = true WHERE "autoForwardEnabled" IS NULL;
UPDATE "Call" SET "voiceConfidence" = 1.0 WHERE "voiceConfidence" IS NULL;
UPDATE "Call" SET "escalated" = false WHERE "escalated" IS NULL;
UPDATE "Call" SET "isDemo" = false WHERE "isDemo" IS NULL;

-- Add comments
COMMENT ON COLUMN "Project"."ownerPhone" IS 'Owner phone number for escalation call forwarding';
COMMENT ON COLUMN "Project"."confidenceThreshold" IS 'Auto-escalate if voiceConfidence below this (default 0.65)';
COMMENT ON COLUMN "Project"."autoForwardEnabled" IS 'Enable automatic call forwarding on low confidence';
COMMENT ON COLUMN "Agent"."demoRecordingUrl" IS 'First quality call recording for marketing demos';
COMMENT ON COLUMN "Call"."voiceConfidence" IS 'Voice recognition confidence score (0-1)';
COMMENT ON COLUMN "Call"."escalationReason" IS 'Why call was escalated: low_confidence|panic_detected|customer_request';
