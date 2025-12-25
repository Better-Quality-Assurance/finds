-- AlterTable
ALTER TABLE "consent_records" ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "consent_records_ip_address_idx" ON "consent_records"("ip_address");
