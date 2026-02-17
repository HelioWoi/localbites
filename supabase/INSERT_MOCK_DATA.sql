-- =====================================================
-- INSERT MOCK ANALYTICS DATA FOR TESTING
-- Execute this to see how the dashboard looks with data
-- =====================================================

-- STEP 1: Get your restaurant ID
-- Run this first to find your restaurant ID:
-- SELECT id, restaurant_name, email FROM partners WHERE email = 'your-email@example.com';

-- STEP 2: Replace 'YOUR_RESTAURANT_ID_HERE' below with your actual restaurant ID

-- STEP 3: Insert mock events (last 7 days)
DO $$
DECLARE
  v_restaurant_id UUID := 'YOUR_RESTAURANT_ID_HERE'; -- REPLACE THIS!
  v_item_id UUID;
  v_session_id TEXT;
  v_date TIMESTAMPTZ;
  i INT;
BEGIN
  -- Get a menu item ID from your restaurant (or create mock items)
  SELECT id INTO v_item_id FROM menu_items WHERE partner_id = v_restaurant_id LIMIT 1;
  
  -- If no items exist, skip item-specific events
  IF v_item_id IS NULL THEN
    RAISE NOTICE 'No menu items found. Creating profile-level events only.';
  END IF;

  -- Generate events for the last 7 days
  FOR i IN 0..6 LOOP
    v_date := NOW() - (i || ' days')::INTERVAL;
    
    -- Morning traffic (7am-10am)
    FOR j IN 1..FLOOR(RANDOM() * 15 + 10) LOOP
      v_session_id := 'mock_session_' || i || '_morning_' || j;
      
      -- Profile view
      INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
      VALUES (v_restaurant_id, v_session_id, 'restaurant_profile_view', 
              CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
              v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours'));
      
      -- Item views (70% of profile viewers)
      IF RANDOM() < 0.7 AND v_item_id IS NOT NULL THEN
        INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
        VALUES (v_restaurant_id, v_session_id, 'item_view', v_item_id,
                CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '30 seconds');
        
        -- Video plays (80% of item viewers)
        IF RANDOM() < 0.8 THEN
          INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
          VALUES (v_restaurant_id, v_session_id, 'video_play', v_item_id,
                  CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                  v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '1 minute');
          
          -- Video completes (60% of video plays)
          IF RANDOM() < 0.6 THEN
            INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
            VALUES (v_restaurant_id, v_session_id, 'video_complete', v_item_id,
                    CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                    v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '1 minute 30 seconds');
          END IF;
          
          -- Likes (20% of video plays)
          IF RANDOM() < 0.2 THEN
            INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
            VALUES (v_restaurant_id, v_session_id, 'like', v_item_id,
                    CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                    v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '2 minutes');
          END IF;
          
          -- Saves (15% of video plays)
          IF RANDOM() < 0.15 THEN
            INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
            VALUES (v_restaurant_id, v_session_id, 'save', v_item_id,
                    CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                    v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '2 minutes 30 seconds');
          END IF;
          
          -- Shares (10% of video plays)
          IF RANDOM() < 0.1 THEN
            INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
            VALUES (v_restaurant_id, v_session_id, 'share', v_item_id,
                    CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                    v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '3 minutes');
          END IF;
        END IF;
      END IF;
      
      -- Actions (30% of profile viewers)
      IF RANDOM() < 0.3 THEN
        IF RANDOM() < 0.6 THEN
          -- Directions click
          INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
          VALUES (v_restaurant_id, v_session_id, 'directions_click',
                  CASE WHEN RANDOM() < 0.7 THEN 'mobile' WHEN RANDOM() < 0.9 THEN 'desktop' ELSE 'tablet' END,
                  v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '4 minutes');
        ELSE
          -- QR scan
          INSERT INTO events (restaurant_id, user_session_id, event_type, device, referrer, created_at)
          VALUES (v_restaurant_id, v_session_id, 'qr_scan', 'mobile', 'qr_code',
                  v_date + (INTERVAL '7 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '4 minutes');
        END IF;
      END IF;
    END LOOP;
    
    -- Lunch traffic (12pm-2pm)
    FOR j IN 1..FLOOR(RANDOM() * 25 + 20) LOOP
      v_session_id := 'mock_session_' || i || '_lunch_' || j;
      
      INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
      VALUES (v_restaurant_id, v_session_id, 'restaurant_profile_view',
              CASE WHEN RANDOM() < 0.8 THEN 'mobile' WHEN RANDOM() < 0.95 THEN 'desktop' ELSE 'tablet' END,
              v_date + (INTERVAL '12 hours') + (RANDOM() * INTERVAL '2 hours'));
      
      IF RANDOM() < 0.75 AND v_item_id IS NOT NULL THEN
        INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
        VALUES (v_restaurant_id, v_session_id, 'item_view', v_item_id,
                CASE WHEN RANDOM() < 0.8 THEN 'mobile' WHEN RANDOM() < 0.95 THEN 'desktop' ELSE 'tablet' END,
                v_date + (INTERVAL '12 hours') + (RANDOM() * INTERVAL '2 hours') + INTERVAL '30 seconds');
        
        IF RANDOM() < 0.85 THEN
          INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
          VALUES (v_restaurant_id, v_session_id, 'video_play', v_item_id,
                  CASE WHEN RANDOM() < 0.8 THEN 'mobile' WHEN RANDOM() < 0.95 THEN 'desktop' ELSE 'tablet' END,
                  v_date + (INTERVAL '12 hours') + (RANDOM() * INTERVAL '2 hours') + INTERVAL '1 minute');
        END IF;
      END IF;
      
      IF RANDOM() < 0.35 THEN
        INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
        VALUES (v_restaurant_id, v_session_id, 'directions_click',
                CASE WHEN RANDOM() < 0.8 THEN 'mobile' WHEN RANDOM() < 0.95 THEN 'desktop' ELSE 'tablet' END,
                v_date + (INTERVAL '12 hours') + (RANDOM() * INTERVAL '2 hours') + INTERVAL '3 minutes');
      END IF;
    END LOOP;
    
    -- Dinner traffic (6pm-9pm)
    FOR j IN 1..FLOOR(RANDOM() * 20 + 15) LOOP
      v_session_id := 'mock_session_' || i || '_dinner_' || j;
      
      INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
      VALUES (v_restaurant_id, v_session_id, 'restaurant_profile_view',
              CASE WHEN RANDOM() < 0.75 THEN 'mobile' WHEN RANDOM() < 0.92 THEN 'desktop' ELSE 'tablet' END,
              v_date + (INTERVAL '18 hours') + (RANDOM() * INTERVAL '3 hours'));
      
      IF RANDOM() < 0.7 AND v_item_id IS NOT NULL THEN
        INSERT INTO events (restaurant_id, user_session_id, event_type, item_id, device, created_at)
        VALUES (v_restaurant_id, v_session_id, 'item_view', v_item_id,
                CASE WHEN RANDOM() < 0.75 THEN 'mobile' WHEN RANDOM() < 0.92 THEN 'desktop' ELSE 'tablet' END,
                v_date + (INTERVAL '18 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '30 seconds');
      END IF;
      
      IF RANDOM() < 0.28 THEN
        INSERT INTO events (restaurant_id, user_session_id, event_type, device, created_at)
        VALUES (v_restaurant_id, v_session_id, 'qr_scan', 'mobile', 'qr_code',
                v_date + (INTERVAL '18 hours') + (RANDOM() * INTERVAL '3 hours') + INTERVAL '2 minutes');
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Mock data inserted successfully! Refresh your analytics dashboard.';
END $$;

-- =====================================================
-- VERIFY DATA
-- =====================================================
-- Run this to check if data was inserted:
-- SELECT 
--   event_type, 
--   COUNT(*) as count,
--   COUNT(DISTINCT user_session_id) as unique_sessions
-- FROM events 
-- WHERE restaurant_id = 'YOUR_RESTAURANT_ID_HERE'
--   AND created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY event_type
-- ORDER BY count DESC;
