-- Fix: Use 'active' instead of 'trial' for subscription_status
-- The constraint only allows specific values

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
  'active',
  NOW()
);

-- Verify the partner was created
SELECT id, email, restaurant_name, address, phone, slug, trial_ends_at, subscription_status
FROM partners
WHERE email = 'flumedining@gmail.com';
