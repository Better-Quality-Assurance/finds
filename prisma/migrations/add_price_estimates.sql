-- Add price estimate fields to listings table
-- Run this migration after deploying the code changes

ALTER TABLE "listings"
ADD COLUMN IF NOT EXISTS "estimate_low" INTEGER,
ADD COLUMN IF NOT EXISTS "estimate_high" INTEGER;

-- Optional: Add index for better query performance when filtering by estimates
-- CREATE INDEX IF NOT EXISTS "idx_listings_estimates" ON "listings"("estimate_low", "estimate_high") WHERE "estimate_low" IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN "listings"."estimate_low" IS 'Lower bound of estimated market value in base currency units';
COMMENT ON COLUMN "listings"."estimate_high" IS 'Upper bound of estimated market value in base currency units';
