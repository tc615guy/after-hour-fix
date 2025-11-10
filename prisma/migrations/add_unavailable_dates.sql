-- Add unavailableDates column to Technician table
-- This allows marking technicians as unavailable on specific dates

ALTER TABLE "Technician" 
ADD COLUMN IF NOT EXISTS "unavailableDates" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "Technician"."unavailableDates" IS 'Array of date strings (YYYY-MM-DD) when technician is unavailable';

