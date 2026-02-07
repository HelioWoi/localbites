-- Migration: Add Lifetime Access and Promo Codes System
-- Created: 2026-02-07
-- Purpose: Allow partners to have lifetime premium access via promo codes

-- 1. Add lifetime_access column to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN DEFAULT FALSE;

-- 2. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lifetime', 'trial_extension', 'discount')),
  discount_amount DECIMAL(10,2),
  discount_percent INTEGER,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  description TEXT
);

-- 3. Create promo_code_usage table (track who used which code)
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, partner_id)
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_partner ON promo_code_usage(partner_id);

-- 5. Insert default lifetime promo codes
INSERT INTO promo_codes (code, type, description, created_by, max_uses)
VALUES 
  ('LIFETIME2026', 'lifetime', 'Lifetime access promo code for early partners', 'system', NULL),
  ('FOUNDER10', 'lifetime', 'Lifetime access for first 10 founders', 'system', 10)
ON CONFLICT (code) DO NOTHING;

-- 6. Create function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comment
COMMENT ON TABLE promo_codes IS 'Promotional codes for discounts and lifetime access';
COMMENT ON TABLE promo_code_usage IS 'Track which partners used which promo codes';
COMMENT ON COLUMN partners.lifetime_access IS 'Partner has lifetime premium access (never expires)';
COMMENT ON FUNCTION increment_promo_usage IS 'Increment the usage counter for a promo code';
