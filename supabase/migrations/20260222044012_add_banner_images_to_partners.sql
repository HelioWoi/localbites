-- Add banner_images column to partners table
-- This allows partners to upload up to 3 promo banner images for their QR code page

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS banner_images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN partners.banner_images IS 'Array of up to 3 banner image URLs for QR code promo slider';
