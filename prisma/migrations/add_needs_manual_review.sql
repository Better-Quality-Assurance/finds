-- Migration: Add needsManualReview field to listing_media table
-- Purpose: Track media items that failed automated license plate blurring
-- Date: 2025-12-26

-- Add the new column with default value false
ALTER TABLE listing_media
ADD COLUMN needs_manual_review BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying of items needing review
CREATE INDEX idx_listing_media_needs_manual_review
ON listing_media(needs_manual_review)
WHERE needs_manual_review = true;

-- Add comment for documentation
COMMENT ON COLUMN listing_media.needs_manual_review IS
  'Flagged when automated license plate blurring fails after retries. Requires manual admin review.';

-- Optional: Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_media_review_queue AS
SELECT
  lm.id AS media_id,
  lm.listing_id,
  lm.public_url,
  lm.original_url,
  lm.license_plate_detected,
  lm.license_plate_blurred,
  lm.plate_detection_data,
  lm.created_at AS media_created_at,
  l.title AS listing_title,
  l.status AS listing_status,
  l.seller_id,
  u.name AS seller_name,
  u.email AS seller_email
FROM listing_media lm
JOIN listings l ON l.id = lm.listing_id
JOIN users u ON u.id = l.seller_id
WHERE lm.needs_manual_review = true
ORDER BY lm.created_at DESC;

-- Grant access to the view (adjust roles as needed)
GRANT SELECT ON admin_media_review_queue TO authenticated;
