-- Complete fix for Flume by the River partner account
-- This will ensure all data is properly set

-- First, get the auth user ID
DO $$
DECLARE
  auth_user_id uuid;
  partner_id uuid;
BEGIN
  -- Get the auth user ID for flumedining@gmail.com
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'flumedining@gmail.com';
  
  -- Update or insert partner with correct data
  INSERT INTO partners (
    id,
    email,
    restaurant_name,
    address,
    phone,
    slug,
    trial_ends_at,
    subscription_status,
    created_at
  ) VALUES (
    auth_user_id,
    'flumedining@gmail.com',
    'Flume by the River',
    '267 Bradman Ave, Maroochydore, Queensland 4558',
    '0488 777 794',
    'flume-by-the-river',
    NOW() + INTERVAL '30 days',
    'active',
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    id = auth_user_id,
    restaurant_name = 'Flume by the River',
    address = '267 Bradman Ave, Maroochydore, Queensland 4558',
    phone = '0488 777 794',
    slug = 'flume-by-the-river',
    trial_ends_at = NOW() + INTERVAL '30 days',
    subscription_status = 'active';
    
END $$;

-- Verify the partner was created/updated correctly
SELECT 
  id, 
  email, 
  restaurant_name, 
  address, 
  phone, 
  slug, 
  trial_ends_at, 
  subscription_status,
  created_at
FROM partners
WHERE email = 'flumedining@gmail.com';
