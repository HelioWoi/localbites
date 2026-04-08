-- ============================================
-- Add Super Admin RLS policies to Affiliate tables
-- Fix: Super Admin dashboard was showing 0 data because
-- RLS only allowed affiliates to see their own data
-- and service_role. No policy existed for super admins.
-- ============================================

-- Super admins can read all affiliates
CREATE POLICY "Super admins can read all affiliates"
  ON affiliates
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can update affiliates (manage status, etc.)
CREATE POLICY "Super admins can update affiliates"
  ON affiliates
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can read all referrals
CREATE POLICY "Super admins can read all referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can read all commissions
CREATE POLICY "Super admins can read all commissions"
  ON affiliate_commissions
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can update commissions (approve, mark paid, reject)
CREATE POLICY "Super admins can update commissions"
  ON affiliate_commissions
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can read all payouts
CREATE POLICY "Super admins can read all payouts"
  ON affiliate_payouts
  FOR SELECT
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.super_admins)
  );

-- Super admins can insert payouts (record payments)
CREATE POLICY "Super admins can insert payouts"
  ON affiliate_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() IN (SELECT email FROM public.super_admins)
  );
