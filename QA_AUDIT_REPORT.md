# 🔍 CRITICAL APP VALIDATION REPORT
**Date:** Feb 3, 2026  
**Auditor:** Senior QA + Lead Engineer  
**Status:** Issues Identified - Fixes Required

---

## 📊 EXECUTIVE SUMMARY

### Issues Found
| Issue | Severity | Root Cause | Status |
|-------|----------|------------|--------|
| Search filter inconsistent | HIGH | Cache key missing filter params | TO FIX |
| OPEN filter shows closed restaurants | HIGH | Stale cache + race condition | TO FIX |
| Back button goes to wrong page | MEDIUM | Hash navigation + state mismatch | TO FIX |
| Duplicate filter application | LOW | Filters applied twice (cache + render) | TO FIX |

---

## 🗺️ ROUTE & NAVIGATION MAP

### App States (Internal Navigation)
```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
├─────────────────────────────────────────────────────────────┤
│  AppState = 'SPLASH' | 'FILTER_SELECTION' | 'FEED' |        │
│             'PROFILE' | 'ADMIN' | 'PARTNER' | 'LOADING'     │
├─────────────────────────────────────────────────────────────┤
│  Navigation Flow:                                            │
│  SPLASH → FILTER_SELECTION → FEED → PROFILE                 │
│                                                              │
│  State Transitions:                                          │
│  - SplashScreen.onFinish() → FILTER_SELECTION               │
│  - FilterSelectionScreen.onSelect() → FEED (after GPS)      │
│  - Restaurant click → PROFILE                                │
│  - onBack() → FEED                                           │
└─────────────────────────────────────────────────────────────┘
```

### URL-Based Routes (window.location)
```
┌─────────────────────────────────────────────────────────────┐
│  Path                    │ Component                        │
├─────────────────────────────────────────────────────────────┤
│  /                       │ App (main flow)                  │
│  /partner                │ PartnerPortal                    │
│  /r/{slug}               │ RestaurantProfileLoader          │
│  /r/{slug}/menu          │ RestaurantMenuLoader             │
│  #profile-{id}           │ RestaurantProfile (hash nav)     │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Handlers Found
| File | Handler | Type | Issue |
|------|---------|------|-------|
| `App.tsx:802` | `setState('FILTER_SELECTION')` | Home button | OK |
| `App.tsx:876` | `setState('PROFILE')` | Saved item click | OK |
| `App.tsx:163-201` | `handleHashChange` | Hash navigation | ⚠️ ISSUE |
| `RestaurantProfile.tsx:31` | `onBack` prop | Back button | OK |

### ⚠️ NAVIGATION ISSUE: Hash Navigation Race Condition

**File:** `App.tsx:163-201`

**Problem:** Hash navigation relies on `allRestaurants` state, but if user navigates directly to `#profile-{id}`, the restaurant may not be in state yet.

**Evidence:**
```typescript
// App.tsx:170-186
let restaurant = allRestaurants.find(r => r.id === restaurantId);

// If not found in allRestaurants, try sessionStorage (from menu page)
if (!restaurant) {
  const storedData = sessionStorage.getItem('restaurant_profile_data');
  // ...
}
```

**Root Cause:** Two sources of truth for restaurant data:
1. `allRestaurants` state
2. `sessionStorage`

---

## 🔍 SEARCH & FILTER PIPELINE

### End-to-End Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    SEARCH PIPELINE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. UI INPUT                                                 │
│     └─ App.tsx: filters state                                │
│        ├─ cuisine: 'All'                                     │
│        ├─ price: ''                                          │
│        ├─ openNow: true (DEFAULT)                            │
│        ├─ dietary: 'All'                                     │
│        ├─ ambiance: 'All'                                    │
│        ├─ hasParking: false                                  │
│        └─ hasOutdoorSeating: false                           │
│                                                              │
│  2. FETCH TRIGGER                                            │
│     └─ fetchRestaurants(location, filters, page)             │
│        └─ getNearbyRestaurants(location, filters, category)  │
│                                                              │
│  3. CACHE CHECK (cacheHelpers.ts)                            │
│     └─ getCachedRestaurants(location, category)              │
│        ├─ Cache Key: `restaurants_cache_${category}`         │
│        ├─ ⚠️ MISSING: filters NOT in cache key!             │
│        └─ Returns cached data if valid                       │
│                                                              │
│  4. API CALL (if cache miss)                                 │
│     └─ searchGooglePlaces(lat, lng, radius, category)        │
│        └─ Edge Function: google-places                       │
│                                                              │
│  5. FILTER APPLICATION #1 (geminiService.ts:200-213)         │
│     └─ applyFilters(results, fullFilters)                    │
│        ├─ Filters applied AFTER cache save                   │
│        └─ ⚠️ Cache has UNFILTERED data                      │
│                                                              │
│  6. FILTER APPLICATION #2 (App.tsx:932-934)                  │
│     └─ displayedRestaurants = filters.openNow                │
│        ? restaurants.filter(r => r.isOpen)                   │
│        : restaurants;                                        │
│        └─ ⚠️ DUPLICATE filter for openNow!                  │
│                                                              │
│  7. RENDER                                                   │
│     └─ displayedRestaurants.map(...)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 ROOT CAUSE ANALYSIS

### Issue 1: Search Filter Inconsistent

**Reproduction Steps:**
1. Open app, select "Cafes"
2. Wait for results to load
3. Toggle OPEN filter OFF
4. Results don't change (still showing same 3 cafes)

**Root Cause:** Cache key does NOT include filter parameters

**File:** `utils/cacheHelpers.ts:47`
```typescript
const cacheKey = `restaurants_cache_${category}`;
// ❌ MISSING: openNow, cuisine, price, etc.
```

**Evidence:** When user changes filters, cache returns OLD data because cache key is the same.

---

### Issue 2: OPEN Filter Shows Closed Restaurants

**Reproduction Steps:**
1. Open app at 5 AM
2. Select "Cafes" with OPEN filter active
3. Mooloolaba Cafe (closes at 2 PM) appears as "open"

**Root Cause:** Multiple issues:

1. **Edge Function returns incorrect `isOpen`:**
   - File: `supabase/functions/google-places/index.ts:265`
   - Uses `place.currentOpeningHours?.openNow ?? true`
   - Defaults to TRUE if unknown (too permissive)

2. **Cache stores stale `isOpen` values:**
   - Cache duration: 30 days (Supabase) + 1 hour (browser)
   - `isOpen` calculated at cache time, not display time

3. **Race condition on filter toggle:**
   - File: `App.tsx:816-836`
   - `setFilters()` is async, but `fetchRestaurants()` called immediately
   - May use OLD filter value due to React state batching

**Evidence:**
```typescript
// App.tsx:816-831
onClick={async () => {
  const newOpenNowValue = !filters.openNow;
  setFilters(f => ({ ...f, openNow: newOpenNowValue }));
  // ⚠️ filters.openNow still has OLD value here!
  await fetchRestaurants(location);
  // fetchRestaurants uses filters from closure, not newOpenNowValue
}}
```

---

### Issue 3: Duplicate Filter Application

**Location 1:** `geminiService.ts:200-213`
```typescript
results = applyFilters(results, fullFilters);
```

**Location 2:** `App.tsx:932-934`
```typescript
const displayedRestaurants = filters.openNow 
  ? restaurants.filter(r => r.isOpen) 
  : restaurants;
```

**Problem:** `openNow` filter is applied TWICE:
1. In `geminiService.ts` before returning
2. In `App.tsx` before rendering

This causes confusion and potential inconsistencies.

---

## ✅ FIX STRATEGY

### Fix 1: Include Filters in Cache Key

**File:** `utils/cacheHelpers.ts`

**Change:**
```typescript
// BEFORE
const cacheKey = `restaurants_cache_${category}`;

// AFTER
const cacheKey = `restaurants_cache_${category}_${location.lat.toFixed(2)}_${location.lng.toFixed(2)}`;
```

**Note:** Do NOT include openNow in cache key because `isOpen` changes over time. Instead, always apply openNow filter at display time.

---

### Fix 2: Fix Race Condition on OPEN Filter Toggle

**File:** `App.tsx:816-836`

**Change:**
```typescript
// BEFORE
onClick={async () => {
  const newOpenNowValue = !filters.openNow;
  setFilters(f => ({ ...f, openNow: newOpenNowValue }));
  await fetchRestaurants(location);
}}

// AFTER
onClick={async () => {
  const newOpenNowValue = !filters.openNow;
  const newFilters = { ...filters, openNow: newOpenNowValue };
  setFilters(newFilters);
  await fetchRestaurants(location, newFilters);
}}
```

---

### Fix 3: Remove Duplicate openNow Filter

**Option A:** Remove from `App.tsx` (keep in `geminiService.ts`)
**Option B:** Remove from `geminiService.ts` (keep in `App.tsx`)

**Recommendation:** Option B - Apply openNow filter ONLY at display time (`App.tsx`) because:
1. `isOpen` is time-sensitive
2. Cache should store ALL restaurants
3. User can toggle filter without re-fetching

---

### Fix 4: Improve Cache Key with Location

**File:** `utils/cacheHelpers.ts`

Include rounded location in cache key to prevent serving wrong location's data.

---

## 📋 IMPLEMENTATION CHECKLIST

- [ ] Fix 1: Update cache key to include location
- [ ] Fix 2: Pass new filters directly to fetchRestaurants
- [ ] Fix 3: Remove openNow from geminiService.ts applyFilters
- [ ] Fix 4: Add request ID guard to prevent race conditions
- [ ] Test: Toggle OPEN filter rapidly
- [ ] Test: Change category and verify results
- [ ] Test: Navigate to profile and back

---

## 🧪 RECOMMENDED TESTS

### Unit Tests
1. `cacheHelpers.ts` - Cache key generation includes all params
2. `filterHelpers.ts` - applyFilters returns correct results
3. `geminiService.ts` - getNearbyRestaurants respects filters

### E2E Tests (Playwright)
1. Apply OPEN filter → only open restaurants shown
2. Toggle OPEN filter → results change immediately
3. Change category → results update
4. Navigate to profile → back returns to feed
5. Deep link to restaurant → navigation stable

---

## 📊 DUPLICATIONS FOUND

| Duplication | Location 1 | Location 2 | Resolution |
|-------------|------------|------------|------------|
| openNow filter | `geminiService.ts:206` | `App.tsx:932-934` | Keep only in App.tsx |
| Restaurant data source | `allRestaurants` state | `sessionStorage` | Consolidate to state |
| Geolocation fallback | `App.tsx:452-489` | `App.tsx:505-540` | Extract to function |

---

## 🎯 SINGLE SOURCE OF TRUTH

After fixes:

| Data | Source of Truth | Location |
|------|-----------------|----------|
| Filters | React state | `App.tsx:filters` |
| Restaurants | React state | `App.tsx:allRestaurants` |
| Category | React state | `App.tsx:selectedCategory` |
| Location | React state | `App.tsx:location` |
| Cache | localStorage | `restaurants_cache_${category}_${lat}_${lng}` |

---

## 📝 COMMITS TO MAKE

1. `fix(cache): include location in cache key`
2. `fix(filters): pass new filters directly to fetchRestaurants`
3. `fix(filters): remove duplicate openNow filter from geminiService`
4. `test: add filter toggle tests`
5. `refactor: extract geolocation fallback to utility`

