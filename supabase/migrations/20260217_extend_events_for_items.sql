-- Extend events table for item-level analytics
-- Add columns for tracking menu items (dishes/drinks)

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS referrer TEXT;

-- Create composite indexes for item-level queries
CREATE INDEX IF NOT EXISTS idx_events_restaurant_item ON public.events(restaurant_id, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_restaurant_type_date ON public.events(restaurant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_item_type ON public.events(item_id, event_type) WHERE item_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.events.item_id IS 'References menu_items.id for item-specific events (item_view, like, save, share)';
COMMENT ON COLUMN public.events.item_type IS 'Type of item: food, drink, special, etc';
COMMENT ON COLUMN public.events.referrer IS 'Source of traffic (qr_code, social_share, direct, etc)';
