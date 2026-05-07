ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS ai_credits_addon_remaining integer DEFAULT 0;

UPDATE partners
SET ai_credits_addon_remaining = COALESCE(ai_credits_addon_remaining, 0)
WHERE ai_credits_addon_remaining IS NULL;
