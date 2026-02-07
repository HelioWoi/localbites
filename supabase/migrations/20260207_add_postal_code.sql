-- Migration: Add postal_code column to partners table
-- Created: 2026-02-07
-- Purpose: Add postal code field for partner addresses

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS postal_code TEXT;

COMMENT ON COLUMN partners.postal_code IS 'Postal/ZIP code for partner address';
