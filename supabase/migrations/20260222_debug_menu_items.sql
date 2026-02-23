-- Debug: Check if there are any triggers on menu_items that might be clearing video_url

-- List all triggers on menu_items table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'menu_items';

-- Check current RLS policies on menu_items
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'menu_items';

-- Try a direct UPDATE to see if it works (replace with your partner_id and item_id)
-- UPDATE menu_items 
-- SET video_url = 'https://test.com/test.mp4'
-- WHERE id = 'ab5bf5ce-f95f-4c9f-9fdc-85f8790b5c74b';
