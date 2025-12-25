-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "payment_intent_id" TEXT,
ADD COLUMN "paid_at" TIMESTAMP(3),
ADD COLUMN "payment_deadline" TIMESTAMP(3);
