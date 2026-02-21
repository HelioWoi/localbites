-- Create partner account for Flume by the River
-- Email: flumedining@gmail.com
-- Password: 123456

-- First, we need to create the auth user via Supabase Dashboard
-- Then insert partner data

-- Insert partner data (run this after creating auth user in Supabase Dashboard)
INSERT INTO partners (
  email,
  restaurant_name,
  address,
  phone,
  slug,
  trial_ends_at,
  subscription_status,
  created_at
) VALUES (
  'flumedining@gmail.com',
  'Flume by the River',
  '267 Bradman Ave, Maroochydore, Queensland 4558',
  '0488 777 794',
  'flume-by-the-river',
  NOW() + INTERVAL '14 days',
  'trial',
  NOW()
);

-- Verify the partner was created
SELECT id, email, restaurant_name, address, phone, slug, trial_ends_at, subscription_status
FROM partners
WHERE email = 'flumedining@gmail.com';
