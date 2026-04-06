-- Allow authenticated users to create their own affiliate record during signup
-- This is required because AffiliateAuth creates auth user first, then inserts into affiliates table from client

CREATE POLICY "Affiliates can insert own data" ON affiliates
  FOR INSERT
  WITH CHECK (
    auth_user_id = auth.uid()
    AND lower(email) = lower(auth.email())
  );
