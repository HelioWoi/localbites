-- Add is_featured column to menu_items table
-- This allows partners to select which video appears as the feed cover

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured 
ON menu_items(partner_id, is_featured) 
WHERE is_featured = TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN menu_items.is_featured IS 'Indicates if this menu item is the featured video that appears first in the feed';
