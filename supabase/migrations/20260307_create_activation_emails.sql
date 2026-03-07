-- Create table to track activation reminder emails sent
CREATE TABLE IF NOT EXISTS activation_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- '10min', '12h', '24h', '48h', '72h'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activation_emails_partner_id ON activation_emails(partner_id);
CREATE INDEX IF NOT EXISTS idx_activation_emails_type ON activation_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_activation_emails_sent_at ON activation_emails(sent_at DESC);

-- Unique constraint to prevent duplicate reminders
CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_emails_unique 
  ON activation_emails(partner_id, email_type);

-- Enable RLS (Row Level Security)
ALTER TABLE activation_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (system) can manage reminders
CREATE POLICY "System can manage activation emails"
  ON activation_emails
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE activation_emails IS 'Track activation reminder emails sent to partners to avoid duplicates';
COMMENT ON COLUMN activation_emails.email_type IS 'Type of reminder: 10min, 12h, 24h, 48h, 72h';
