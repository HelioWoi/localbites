-- Create removal_requests table for business owners to request listing removal
CREATE TABLE IF NOT EXISTS removal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  verified_business_name TEXT,
  abn TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  reason TEXT,
  google_place_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE removal_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can submit removal request"
  ON removal_requests FOR INSERT
  WITH CHECK (true);

-- Only admins can read/update
CREATE POLICY "Admins can view removal requests"
  ON removal_requests FOR SELECT
  USING (auth.uid() IN (SELECT id FROM super_admins));

CREATE POLICY "Admins can update removal requests"
  ON removal_requests FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM super_admins));
