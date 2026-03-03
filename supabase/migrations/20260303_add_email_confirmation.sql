-- Add email confirmation fields to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_confirmation_token TEXT,
ADD COLUMN IF NOT EXISTS email_confirmation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_confirmation_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_partners_email_confirmation_token ON partners(email_confirmation_token);

-- Update existing partners to have email_confirmed = true (grandfather them in)
UPDATE partners
SET email_confirmed = TRUE
WHERE email_confirmed IS NULL OR email_confirmed = FALSE;
