-- Run this in Supabase SQL Editor to fix field length errors
-- This will allow phone numbers, postal codes, and ABNs to be longer

ALTER TABLE partners 
  ALTER COLUMN phone TYPE varchar(20),
  ALTER COLUMN postal_code TYPE varchar(10),
  ALTER COLUMN abn TYPE varchar(15);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'partners' 
AND column_name IN ('phone', 'postal_code', 'abn');
