-- Migration: Add photo_url to menu_items
-- Created: 2026-02-09
-- Purpose: Allow menu items to have a photo (for items without video)

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS photo_url TEXT;
