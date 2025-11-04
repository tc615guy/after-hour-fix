-- Migration: Add systemType field for dual-mode support (Vapi vs OpenAI Realtime)
-- Run: npx prisma migrate dev --name add_system_type

-- Add systemType to Agent table (default 'vapi' for backward compatibility)
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "systemType" TEXT NOT NULL DEFAULT 'vapi';

-- Add systemType to PhoneNumber table (default 'vapi' for backward compatibility)
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "systemType" TEXT NOT NULL DEFAULT 'vapi';

-- Add comment for documentation
COMMENT ON COLUMN "Agent"."systemType" IS 'System type: "vapi" or "openai-realtime"';
COMMENT ON COLUMN "PhoneNumber"."systemType" IS 'System type: "vapi" or "openai-realtime"';
