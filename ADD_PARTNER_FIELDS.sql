-- Add new fields to partners table for complete business information
-- Run this in Supabase SQL Editor

-- Add address, phone, and website fields
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS website TEXT;

-- Add ABN verification fields (for future use when GUID arrives)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS abn VARCHAR(11),
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_abn ON partners(abn);
CREATE INDEX IF NOT EXISTS idx_partners_phone ON partners(phone);
CREATE INDEX IF NOT EXISTS idx_partners_is_verified ON partners(is_verified);

-- Add constraint for unique ABN (optional, can be enabled later)
-- ALTER TABLE partners ADD CONSTRAINT unique_abn UNIQUE (abn);

-- View current partners table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'partners' 
ORDER BY ordinal_position;
