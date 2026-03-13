-- Script to update existing chat conversations with location data
-- Run this in Supabase SQL Editor after implementing location capture

-- Example: Update a specific conversation with location
-- UPDATE chat_conversations 
-- SET user_info = jsonb_set(
--   COALESCE(user_info, '{}'::jsonb),
--   '{location}',
--   '"Sydney, Australia"'
-- )
-- WHERE session_id = 'your_session_id';

-- Note: Location should be captured automatically from the user's browser
-- using the Geolocation API or IP-based location service in the LoveBotChat component
