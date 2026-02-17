-- =====================================================
-- CLEANUP MOCK ANALYTICS DATA
-- Execute this to remove all mock data and return to normal
-- =====================================================

-- STEP 1: Replace 'YOUR_RESTAURANT_ID_HERE' with your actual restaurant ID

-- STEP 2: Delete all mock events (sessions starting with 'mock_session_')
DELETE FROM events 
WHERE restaurant_id = 'YOUR_RESTAURANT_ID_HERE'
  AND user_session_id LIKE 'mock_session_%';

-- STEP 3: Verify cleanup
SELECT 
  COUNT(*) as remaining_mock_events
FROM events 
WHERE restaurant_id = 'YOUR_RESTAURANT_ID_HERE'
  AND user_session_id LIKE 'mock_session_%';

-- Should return 0 if cleanup was successful

-- =====================================================
-- DONE! Your analytics are back to normal.
-- =====================================================
