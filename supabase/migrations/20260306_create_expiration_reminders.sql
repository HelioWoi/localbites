-- Create table to track expiration reminder emails sent
CREATE TABLE IF NOT EXISTS expiration_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- '10_days', '5_days', '3_days', '2_days', '1_day', 'expired'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_expiration_reminders_partner_id ON expiration_reminders(partner_id);
CREATE INDEX IF NOT EXISTS idx_expiration_reminders_type ON expiration_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_expiration_reminders_sent_at ON expiration_reminders(sent_at DESC);

-- Unique constraint to prevent duplicate reminders
CREATE UNIQUE INDEX IF NOT EXISTS idx_expiration_reminders_unique 
  ON expiration_reminders(partner_id, reminder_type, expiration_date);

-- Enable RLS (Row Level Security)
ALTER TABLE expiration_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (system) can manage reminders
CREATE POLICY "System can manage expiration reminders"
  ON expiration_reminders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE expiration_reminders IS 'Track expiration reminder emails sent to partners to avoid duplicates';
COMMENT ON COLUMN expiration_reminders.reminder_type IS 'Type of reminder: 10_days, 5_days, 3_days, 2_days, 1_day, expired';
