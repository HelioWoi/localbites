# ANALYTICS AUDIT - MenuLove Platform

## 📊 CURRENT STATE vs REQUIREMENTS

### ✅ WHAT WE ALREADY HAVE:

#### 1. **Database Table: `events`**
- ✅ `id` (uuid)
- ✅ `restaurant_id` (uuid, references partners)
- ✅ `user_session_id` (text) - **EQUIVALENT to session_id**
- ✅ `event_type` (text)
- ✅ `device` (text) - **EQUIVALENT to device_type**
- ✅ `created_at` (timestamp) - **EQUIVALENT to timestamp**
- ✅ Row Level Security enabled
- ✅ Indexes for performance
- ✅ Materialized view for daily summaries

#### 2. **Event Tracking Service: `eventsService.ts`**
- ✅ Session ID generation (`getSessionId()`)
- ✅ Device detection (`getDeviceType()`)
- ✅ Event tracking function (`trackEvent()`)
- ✅ Debug mode support (`?debugAnalytics=1`)
- ✅ Debug logging to console and localStorage

#### 3. **SQL Functions for Analytics**
- ✅ `get_partner_summary` - Metrics summary
- ✅ `get_partner_funnel` - Conversion funnel
- ✅ `get_partner_top_items` - Top performing items
- ✅ `get_partner_peak_hours` - Peak hours analysis
- ✅ `get_partner_insights` - Auto-generated insights

#### 4. **Event Types Already Tracked**
- ✅ `page_view`
- ✅ `search_performed`
- ✅ `restaurant_profile_view` - **EQUIVALENT to profile_view**
- ✅ `item_view`
- ✅ `video_play`
- ✅ `video_complete`
- ✅ `like`
- ✅ `save`
- ✅ `share`
- ✅ `qr_scan`
- ✅ `directions_click`
- ✅ `order_button_click` - **EQUIVALENT to order_click**

---

## ❌ WHAT'S MISSING:

### 1. **Database Schema Gaps:**
- ❌ `item_id` column (nullable) - **CRITICAL**
- ❌ `referrer` column (qr/link/search/social/direct) - **IMPORTANT**
- ❌ `item_type` column (already in event_value, but not dedicated)

### 2. **Tracking Gaps:**
- ⚠️ Events may not be firing consistently across all pages
- ⚠️ `item_id` not being passed in most events
- ⚠️ `referrer` not being tracked
- ⚠️ Duplicate event prevention may not be robust enough

### 3. **Dashboard Gaps:**
- ❌ No "Top Performing Dishes" heatmap/ranking
- ❌ No visual funnel representation
- ⚠️ SQL functions may not be deployed (causing 0 metrics)

---

## 🔧 REQUIRED FIXES:

### **FIX 1: Add Missing Columns to `events` Table**
```sql
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referrer TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT;

CREATE INDEX IF NOT EXISTS idx_events_item_id ON public.events(item_id);
CREATE INDEX IF NOT EXISTS idx_events_referrer ON public.events(referrer);
```

### **FIX 2: Update Event Tracking to Include Missing Data**
- Pass `item_id` when tracking item/video events
- Detect and pass `referrer` (QR, direct, search, etc.)
- Ensure `item_type` is captured

### **FIX 3: Implement Robust Duplicate Prevention**
- Use `useRef` to track fired events per component mount
- Implement debouncing for rapid-fire events
- Add unique event guards per session

### **FIX 4: Deploy SQL Functions**
- Execute `FIX_ANALYTICS.sql` in Supabase
- Verify functions exist and work

### **FIX 5: Add Top Dishes Feature to Dashboard**
- Create visual ranking of most viewed dishes
- Show engagement metrics per dish
- Add heatmap visualization

---

## 📋 IMPLEMENTATION PLAN:

### **Phase 1: Database Schema** (5 min)
1. Add missing columns to `events` table
2. Create indexes
3. Update RLS policies if needed

### **Phase 2: Event Tracking Enhancement** (15 min)
1. Update `eventsService.ts` to accept `itemId` and `referrer`
2. Add referrer detection logic
3. Implement duplicate prevention guards
4. Update all tracking calls to pass complete data

### **Phase 3: Dashboard Improvements** (20 min)
1. Deploy SQL functions via `FIX_ANALYTICS.sql`
2. Add "Top Performing Dishes" section
3. Add visual funnel chart
4. Improve debug mode visibility

### **Phase 4: Testing & Validation** (10 min)
1. Enable debug mode (`?debugAnalytics=1`)
2. Navigate through app and verify events
3. Check dashboard for accurate metrics
4. Verify no duplicate events

---

## 🎯 SUCCESS CRITERIA:

- ✅ All events include `restaurant_id`, `item_id`, `session_id`, `device`, `referrer`, `timestamp`
- ✅ No duplicate events on React re-renders
- ✅ Debug mode shows all events in console
- ✅ Dashboard shows accurate metrics
- ✅ "Top Performing Dishes" section displays correctly
- ✅ Conversion funnel shows realistic progression
- ✅ QR scans are tracked when `?source=qr` is present

---

## 🚀 NEXT STEPS:

1. **Execute database migration** (add columns)
2. **Update eventsService.ts** (add missing params)
3. **Update tracking calls** (pass complete data)
4. **Deploy SQL functions** (FIX_ANALYTICS.sql)
5. **Add Top Dishes UI** (Partner Dashboard)
6. **Test thoroughly** (debug mode)

---

**ESTIMATED TIME: 50 minutes**
**RISK LEVEL: Low** (only adding features, not changing existing code)
**BREAKING CHANGES: None** (backward compatible)
