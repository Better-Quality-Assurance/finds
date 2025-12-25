-- AlterTable
-- Add ban tracking fields to users table
ALTER TABLE "users" ADD COLUMN "banned_at" TIMESTAMP(3),
ADD COLUMN "ban_reason" TEXT,
ADD COLUMN "unbanned_at" TIMESTAMP(3),
ADD COLUMN "unban_reason" TEXT;
