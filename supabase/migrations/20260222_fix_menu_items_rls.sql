-- Fix RLS policies for menu_items table to allow partners to insert their own items

-- Enable RLS if not already enabled
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Partners can insert own menu items" ON menu_items;
DROP POLICY IF EXISTS "Partners can read own menu items" ON menu_items;
DROP POLICY IF EXISTS "Partners can update own menu items" ON menu_items;
DROP POLICY IF EXISTS "Partners can delete own menu items" ON menu_items;
DROP POLICY IF EXISTS "Public can read menu items" ON menu_items;

-- Allow partners to INSERT their own menu items
CREATE POLICY "Partners can insert own menu items"
ON menu_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = partner_id);

-- Allow partners to SELECT their own menu items
CREATE POLICY "Partners can read own menu items"
ON menu_items
FOR SELECT
TO authenticated
USING (auth.uid() = partner_id);

-- Allow partners to UPDATE their own menu items
CREATE POLICY "Partners can update own menu items"
ON menu_items
FOR UPDATE
TO authenticated
USING (auth.uid() = partner_id)
WITH CHECK (auth.uid() = partner_id);

-- Allow partners to DELETE their own menu items
CREATE POLICY "Partners can delete own menu items"
ON menu_items
FOR DELETE
TO authenticated
USING (auth.uid() = partner_id);

-- Allow public to read menu items (for QR code route and app feed)
CREATE POLICY "Public can read menu items"
ON menu_items
FOR SELECT
TO anon
USING (deleted_at IS NULL);
