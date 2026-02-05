-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Create policy: Only super admins can read
CREATE POLICY "Super admins can read super_admins table"
  ON super_admins
  FOR SELECT
  USING (
    email IN (SELECT email FROM super_admins)
  );

-- Create policy: Only super admins can insert
CREATE POLICY "Super admins can insert super_admins"
  ON super_admins
  FOR INSERT
  WITH CHECK (
    email IN (SELECT email FROM super_admins)
  );

-- Insert your email as the first super admin
-- IMPORTANT: Replace with your actual email
INSERT INTO super_admins (email)
VALUES ('helio@localbites.com')
ON CONFLICT (email) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);

-- Add comment
COMMENT ON TABLE super_admins IS 'Table to store super admin users who have access to the admin dashboard';
