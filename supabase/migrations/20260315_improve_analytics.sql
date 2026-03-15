-- =====================================================
-- IMPROVE ANALYTICS - Add Missing Columns
-- =====================================================
-- This migration adds item_id and referrer columns to events table
-- for more comprehensive analytics tracking

-- Add missing columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_item_id ON public.events(item_id);
CREATE INDEX IF NOT EXISTS idx_events_referrer ON public.events(referrer);
CREATE INDEX IF NOT EXISTS idx_events_item_type ON public.events(item_type);

-- Add comment
COMMENT ON COLUMN public.events.item_id IS 'Reference to menu item (dish/video) being viewed';
COMMENT ON COLUMN public.events.referrer IS 'Traffic source: qr, link, search, social, direct';
COMMENT ON COLUMN public.events.item_type IS 'Category/type of the item being viewed';

-- =====================================================
-- DONE! Analytics table now has all required fields
-- =====================================================
