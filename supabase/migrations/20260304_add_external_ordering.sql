-- Add external ordering redirect feature
-- Created: 2026-03-04
-- Purpose: Allow partners to redirect customers to their existing ordering systems (Square, Mr Yum, etc)
-- IMPORTANT: This is NOT a payment integration - just a simple redirect system

-- 1. Add ordering URL to partners table (restaurant-level default)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS ordering_url TEXT,
ADD COLUMN IF NOT EXISTS enable_ordering_button BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN partners.ordering_url IS 'External ordering system URL (Square, Mr Yum, Shopify, etc) - restaurant default';
COMMENT ON COLUMN partners.enable_ordering_button IS 'Toggle to show/hide Order Now button on frontend';

-- 2. Add optional per-dish ordering URL to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS dish_order_url TEXT;

COMMENT ON COLUMN menu_items.dish_order_url IS 'Optional per-dish ordering URL - overrides restaurant default if set';

-- 3. Add new event type for tracking order button clicks
-- No schema change needed - events table already supports any event_type
-- We'll use event_type = 'order_button_click' with event_value = dish_id or 'general'

-- Create index for faster order click analytics queries
CREATE INDEX IF NOT EXISTS idx_events_order_clicks 
ON public.events(restaurant_id, created_at DESC) 
WHERE event_type = 'order_button_click';

-- Add comment for documentation
COMMENT ON INDEX idx_events_order_clicks IS 'Optimizes queries for order button click analytics';
