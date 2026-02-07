-- ============================================
-- CLEAN TEST DATA FROM SUPABASE
-- ============================================
-- Run this script to clean all test data before going to production
-- IMPORTANT: This will DELETE all test data permanently!
-- Make sure you have backups if needed

-- ============================================
-- STEP 1: BACKUP (OPTIONAL - RUN FIRST IF YOU WANT TO KEEP DATA)
-- ============================================
-- Uncomment these lines to create backups before deleting:
-- CREATE TABLE partners_backup AS SELECT * FROM partners;
-- CREATE TABLE menu_items_backup AS SELECT * FROM menu_items;
-- CREATE TABLE saves_backup AS SELECT * FROM saves;
-- CREATE TABLE likes_backup AS SELECT * FROM likes;
-- CREATE TABLE subscriptions_backup AS SELECT * FROM subscriptions;
-- CREATE TABLE payment_history_backup AS SELECT * FROM payment_history;

-- ============================================
-- STEP 2: VIEW CURRENT DATA (CHECK BEFORE DELETING)
-- ============================================
-- See what will be deleted:
SELECT 'Partners' as table_name, COUNT(*) as count FROM partners
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'Saves', COUNT(*) FROM saves
UNION ALL
SELECT 'Likes', COUNT(*) FROM likes
UNION ALL
SELECT 'Subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'Payment History', COUNT(*) FROM payment_history
UNION ALL
SELECT 'Restaurant Stats', COUNT(*) FROM restaurant_stats;

-- ============================================
-- STEP 3: DELETE TEST DATA
-- ============================================
-- IMPORTANT: Run these in order due to foreign key constraints

-- 3.1 Delete menu items (has foreign key to partners)
DELETE FROM menu_items;
ALTER SEQUENCE menu_items_id_seq RESTART WITH 1;

-- 3.2 Delete user interactions
DELETE FROM saves;
DELETE FROM likes;

-- 3.3 Delete restaurant stats
DELETE FROM restaurant_stats;

-- 3.4 Delete subscription and payment data
DELETE FROM payment_history;
DELETE FROM subscriptions;

-- 3.5 Delete partners (do this last)
DELETE FROM partners;

-- 3.6 Delete auth users (CAREFUL - this deletes authentication accounts)
-- Uncomment only if you want to delete ALL user accounts:
-- DELETE FROM auth.users;

-- ============================================
-- STEP 4: RESET AUTO-INCREMENT SEQUENCES
-- ============================================
-- This ensures new records start from ID 1
-- (Already done above for menu_items, add others if needed)

-- ============================================
-- STEP 5: VERIFY DELETION
-- ============================================
-- Check that all tables are empty:
SELECT 'Partners' as table_name, COUNT(*) as remaining FROM partners
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menu_items
UNION ALL
SELECT 'Saves', COUNT(*) FROM saves
UNION ALL
SELECT 'Likes', COUNT(*) FROM likes
UNION ALL
SELECT 'Subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'Payment History', COUNT(*) FROM payment_history
UNION ALL
SELECT 'Restaurant Stats', COUNT(*) FROM restaurant_stats;

-- ============================================
-- STEP 6: CLEAN STORAGE BUCKETS
-- ============================================
-- You need to do this manually in Supabase Dashboard:
-- 1. Go to Storage → menu-videos bucket
-- 2. Select all folders/files
-- 3. Delete them
-- 
-- Or use this query to see what's in storage:
-- SELECT * FROM storage.objects WHERE bucket_id = 'menu-videos';

-- ============================================
-- NOTES:
-- ============================================
-- After cleaning:
-- 1. Test signup flow with real data
-- 2. Verify Stripe webhooks work with Live mode
-- 3. Monitor first real partners carefully
-- 4. Keep Admin Dashboard open to moderate content
-- 
-- Remember: You're now in PRODUCTION mode!
-- All new data is REAL customer data.
