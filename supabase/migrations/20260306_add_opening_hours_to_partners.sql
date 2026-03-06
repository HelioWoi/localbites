-- Add opening_hours field to partners table for manual input
-- This is separate from google_opening_hours which is cached from Google API

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN partners.opening_hours IS 'Opening hours manually entered by partner (format: {"monday": "9:00 AM - 5:00 PM", "tuesday": "9:00 AM - 5:00 PM", ...})';

-- Example format:
-- {
--   "monday": "9:00 AM - 5:00 PM",
--   "tuesday": "9:00 AM - 5:00 PM",
--   "wednesday": "9:00 AM - 5:00 PM",
--   "thursday": "9:00 AM - 5:00 PM",
--   "friday": "9:00 AM - 5:00 PM",
--   "saturday": "10:00 AM - 4:00 PM",
--   "sunday": "Closed"
-- }
