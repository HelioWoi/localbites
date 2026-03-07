-- Add marketing email preferences to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS marketing_emails_enabled BOOLEAN DEFAULT true;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_partners_marketing_emails 
  ON partners(marketing_emails_enabled);

-- Add comment
COMMENT ON COLUMN partners.marketing_emails_enabled IS 'Whether partner wants to receive marketing and activation emails. Default true.';
