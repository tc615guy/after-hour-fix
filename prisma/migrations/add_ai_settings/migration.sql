-- Migration: Add aiSettings field to Project table
-- Run: npx prisma migrate deploy (production) or npx prisma migrate dev (development)

-- Add aiSettings column as JSON
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "aiSettings" JSON;

-- Add comment for documentation
COMMENT ON COLUMN "Project"."aiSettings" IS 'Advanced AI configuration (conversation style, behavior, etc.)';
