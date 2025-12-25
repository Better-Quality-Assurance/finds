-- AlterTable: Add Stripe Connect fields to users table
ALTER TABLE "users" ADD COLUMN "stripe_connect_account_id" TEXT,
ADD COLUMN "stripe_connect_status" TEXT,
ADD COLUMN "payout_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripe_connect_onboarded_at" TIMESTAMP(3);

-- AlterTable: Add seller payout tracking to auctions table
ALTER TABLE "auctions" ADD COLUMN "seller_payout_status" TEXT,
ADD COLUMN "seller_payout_id" TEXT,
ADD COLUMN "seller_payout_amount" DECIMAL(12,2),
ADD COLUMN "seller_paid_at" TIMESTAMP(3);

-- CreateIndex: Add index on stripe_connect_account_id for faster lookups
CREATE INDEX "users_stripe_connect_account_id_idx" ON "users"("stripe_connect_account_id");

-- CreateIndex: Add index on seller_payout_status for reporting
CREATE INDEX "auctions_seller_payout_status_idx" ON "auctions"("seller_payout_status");
