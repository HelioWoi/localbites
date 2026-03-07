-- Create table to track signup attempts for rate limiting and security
CREATE TABLE IF NOT EXISTS signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  email TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  recaptcha_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON signup_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON signup_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_created ON signup_attempts(created_at DESC);

-- Create table for temporary email domains blacklist
CREATE TABLE IF NOT EXISTS temp_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add common temporary email domains
INSERT INTO temp_email_domains (domain) VALUES
  ('tempmail.com'),
  ('temp-mail.org'),
  ('guerrillamail.com'),
  ('10minutemail.com'),
  ('mailinator.com'),
  ('throwaway.email'),
  ('getnada.com'),
  ('maildrop.cc'),
  ('trashmail.com'),
  ('yopmail.com'),
  ('fakeinbox.com'),
  ('sharklasers.com'),
  ('guerrillamail.info'),
  ('grr.la'),
  ('guerrillamail.biz'),
  ('guerrillamail.de'),
  ('spam4.me'),
  ('mailnesia.com'),
  ('emailondeck.com'),
  ('mintemail.com')
ON CONFLICT (domain) DO NOTHING;

-- Enable RLS
ALTER TABLE signup_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_email_domains ENABLE ROW LEVEL SECURITY;

-- Policies: Only system can manage
CREATE POLICY "System can manage signup attempts"
  ON signup_attempts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can manage temp email domains"
  ON temp_email_domains
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE signup_attempts IS 'Track all signup attempts for rate limiting and security analysis';
COMMENT ON TABLE temp_email_domains IS 'Blacklist of temporary/disposable email domains';
COMMENT ON COLUMN signup_attempts.recaptcha_score IS 'Google reCAPTCHA v3 score (0.0-1.0, higher = more human)';
COMMENT ON COLUMN signup_attempts.blocked_reason IS 'Reason if signup was blocked: rate_limit, temp_email, low_recaptcha, honeypot, etc';
