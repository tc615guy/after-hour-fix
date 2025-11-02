-- Migration: Add serverUrl and serverUrlSecret to PhoneNumber table
-- Run manually: psql $DATABASE_URL -f prisma/migrations/add_phone_number_server_url.sql

ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "serverUrl" TEXT;
ALTER TABLE "PhoneNumber" ADD COLUMN IF NOT EXISTS "serverUrlSecret" TEXT;

COMMENT ON COLUMN "PhoneNumber"."serverUrl" IS 'Webhook URL for this specific phone number';
COMMENT ON COLUMN "PhoneNumber"."serverUrlSecret" IS 'Auth secret for webhook';

