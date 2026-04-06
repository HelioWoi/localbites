-- ============================================
-- MenuLove Affiliate System
-- ============================================

-- Affiliates table (creators who refer partners)
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- managed by Supabase Auth
  auth_user_id UUID, -- links to auth.users
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  total_referrals INTEGER DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_paid DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT, -- 'bank_transfer', 'paypal', etc.
  payment_details JSONB, -- bank details, paypal email, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table (tracks which partner signed up via which affiliate)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  partner_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed', 'churned')),
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  first_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate commissions table (tracks each commission earned)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('first_payment', 'recurring')),
  amount DECIMAL(10,2) NOT NULL, -- commission amount
  invoice_amount DECIMAL(10,2), -- original invoice amount
  commission_rate DECIMAL(5,2), -- percentage rate (e.g., 25.00)
  payment_number INTEGER DEFAULT 1, -- which payment (1-7: first + 6 months recurring)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate payouts table (tracks when owner pays affiliates)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT, -- 'bank_transfer', 'paypal', etc.
  reference TEXT, -- payment reference/receipt
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_auth_user_id ON affiliates(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_partner_id ON referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referral_id ON affiliate_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

-- Add referred_by to partners table to track which affiliate referred them
ALTER TABLE partners ADD COLUMN IF NOT EXISTS referred_by_affiliate_id UUID REFERENCES affiliates(id);

-- RLS Policies
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliates can read their own data
CREATE POLICY "Affiliates can read own data" ON affiliates
  FOR SELECT USING (auth_user_id = auth.uid());

-- Affiliates can update their own data (limited fields)
CREATE POLICY "Affiliates can update own data" ON affiliates
  FOR UPDATE USING (auth_user_id = auth.uid());

-- Affiliates can read their own referrals
CREATE POLICY "Affiliates can read own referrals" ON referrals
  FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE auth_user_id = auth.uid()));

-- Affiliates can read their own commissions
CREATE POLICY "Affiliates can read own commissions" ON affiliate_commissions
  FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE auth_user_id = auth.uid()));

-- Affiliates can read their own payouts
CREATE POLICY "Affiliates can read own payouts" ON affiliate_payouts
  FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE auth_user_id = auth.uid()));

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access affiliates" ON affiliates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access commissions" ON affiliate_commissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access payouts" ON affiliate_payouts
  FOR ALL USING (auth.role() = 'service_role');

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(affiliate_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base code from name (first 6 chars, uppercase, alphanumeric only)
  base_code := UPPER(REGEXP_REPLACE(LEFT(affiliate_name, 6), '[^A-Za-z0-9]', '', 'g'));
  
  -- If too short, pad with random chars
  IF LENGTH(base_code) < 3 THEN
    base_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 3));
  END IF;
  
  -- Add random suffix
  final_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 4));
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM affiliates WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || counter::TEXT), 1, 4));
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update affiliate totals
CREATE OR REPLACE FUNCTION update_affiliate_totals(aff_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE affiliates SET
    total_referrals = (SELECT COUNT(*) FROM referrals WHERE affiliate_id = aff_id),
    total_earned = COALESCE((SELECT SUM(amount) FROM affiliate_commissions WHERE affiliate_id = aff_id AND status IN ('approved', 'paid')), 0),
    total_paid = COALESCE((SELECT SUM(amount) FROM affiliate_payouts WHERE affiliate_id = aff_id), 0),
    updated_at = NOW()
  WHERE id = aff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
