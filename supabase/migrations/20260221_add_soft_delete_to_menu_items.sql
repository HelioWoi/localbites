-- Add soft delete column to menu_items table
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at 
ON menu_items(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Create index for active items queries
CREATE INDEX IF NOT EXISTS idx_menu_items_active 
ON menu_items(partner_id, deleted_at) 
WHERE deleted_at IS NULL;
