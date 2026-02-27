-- Fix partner table field lengths to prevent "value too long" errors
-- ABN: 11 digits (keep as is)
-- Phone: can be longer with country code (+61 xxx xxx xxx = 15+ chars)
-- Postal code: Australian postcodes are 4 digits, but allow more for flexibility

ALTER TABLE partners 
  ALTER COLUMN phone TYPE varchar(20),
  ALTER COLUMN postal_code TYPE varchar(10),
  ALTER COLUMN abn TYPE varchar(15); -- Allow spaces/formatting in ABN
