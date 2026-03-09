# Google Analytics 4 Data API Setup Guide

## Overview
This guide explains how to integrate real Google Analytics 4 data into the MenuLove Admin Dashboard.

**Current Status:** Mock data is being displayed. Follow these steps to connect real GA4 data.

---

## Prerequisites
- Google Analytics 4 property set up (already done ✅)
- Measurement ID: `G-846VMWZYX5`
- Google Cloud Console access
- Supabase project access

---

## Step 1: Create Service Account in Google Cloud

### 1.1 Go to Google Cloud Console
1. Visit: https://console.cloud.google.com
2. Select your project (or create a new one)

### 1.2 Enable Google Analytics Data API
1. Go to **APIs & Services** → **Library**
2. Search for "Google Analytics Data API"
3. Click **Enable**

### 1.3 Create Service Account
1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Fill in details:
   - **Name:** `menulove-ga4-reader`
   - **Description:** `Service account for reading GA4 data in MenuLove admin dashboard`
4. Click **Create and Continue**
5. Grant role: **Viewer** (or create custom role with `analyticsdata.googleapis.com` permissions)
6. Click **Done**

### 1.4 Create Service Account Key
1. Click on the newly created service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create**
6. **Save the downloaded JSON file securely** (you'll need it in Step 3)

---

## Step 2: Add Service Account to Google Analytics

### 2.1 Get Service Account Email
From the downloaded JSON file, copy the `client_email` value.
Example: `menulove-ga4-reader@your-project.iam.gserviceaccount.com`

### 2.2 Add to GA4 Property
1. Go to https://analytics.google.com
2. Click **Admin** (bottom left)
3. In the **Property** column, click **Property Access Management**
4. Click **+** (Add users)
5. Paste the service account email
6. Select role: **Viewer**
7. Uncheck "Notify new users by email"
8. Click **Add**

---

## Step 3: Configure Supabase Secrets

### 3.1 Get GA4 Property ID
1. Go to https://analytics.google.com
2. Click **Admin** → **Property Settings**
3. Copy the **Property ID** (format: `123456789`)

### 3.2 Add Secrets to Supabase
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `quybuvapflnzcaedjbkl`
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Add two secrets:

**Secret 1: GA4_PROPERTY_ID**
```
Value: [Your Property ID from step 3.1]
Example: 123456789
```

**Secret 2: GA4_SERVICE_ACCOUNT**
```
Value: [Entire contents of the JSON file from step 1.4]
Example:
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "menulove-ga4-reader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

**Important:** Paste the entire JSON content as a single line or with proper escaping.

---

## Step 4: Deploy Edge Function

### 4.1 Deploy to Supabase
```bash
cd /Users/heliowoi/Documents/local-bites
supabase functions deploy ga4-analytics --no-verify-jwt
```

### 4.2 Verify Deployment
1. Check Supabase Dashboard → **Edge Functions**
2. You should see `ga4-analytics` listed
3. Status should be **Active**

---

## Step 5: Test Integration

### 5.1 Test Edge Function
```bash
curl -X POST https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/ga4-analytics \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "activeUsers": 1,
    "totalUsers7d": 42,
    ...
  },
  "isMock": false
}
```

If `isMock: true`, check that secrets are configured correctly.

### 5.2 Test in Admin Dashboard
1. Go to http://localhost:3000/admin
2. Login with super admin credentials
3. Navigate to **Overview** tab
4. Scroll to **Google Analytics** widget
5. You should see:
   - ✅ Green badge: "Live Data Connected"
   - Real numbers from your GA4 property

---

## Troubleshooting

### Issue: Widget shows "Mock data"
**Cause:** Secrets not configured or Edge Function not deployed

**Solution:**
1. Verify secrets exist in Supabase Dashboard
2. Redeploy Edge Function: `supabase functions deploy ga4-analytics --no-verify-jwt`
3. Refresh admin dashboard

### Issue: "403 Forbidden" error
**Cause:** Service account doesn't have access to GA4 property

**Solution:**
1. Verify service account email is added to GA4 property (Step 2.2)
2. Check that role is **Viewer** or higher

### Issue: "Invalid credentials" error
**Cause:** Service account JSON is malformed

**Solution:**
1. Re-download service account key from Google Cloud Console
2. Ensure entire JSON is copied correctly to Supabase secret
3. No extra spaces or line breaks

---

## Security Notes

✅ **Safe:**
- Service account key is stored in Supabase secrets (server-side only)
- Never exposed to client/browser
- Read-only access to GA4 data

❌ **Never:**
- Commit service account JSON to Git
- Share service account key publicly
- Give service account more permissions than needed

---

## Data Refresh

- **Auto-refresh:** Every 5 minutes
- **Manual refresh:** Click refresh button in widget
- **Real-time data:** Updates within 2-3 minutes of actual events

---

## Cost

✅ **FREE** for most use cases:
- Google Analytics Data API: 100,000 requests/day free
- Admin dashboard makes ~288 requests/day (every 5 min)
- Well within free tier limits

---

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify GA4 property is receiving data
3. Test service account permissions in Google Cloud Console

---

**Setup Time:** ~15 minutes  
**Difficulty:** Medium  
**Status:** Ready to configure
