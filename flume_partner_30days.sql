-- Create partner account for Flume by the River
-- 30 days free trial

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
  NOW() + INTERVAL '30 days',
  'active',
  NOW()
);

-- Verificar se foi criado
SELECT id, email, restaurant_name, address, phone, slug, trial_ends_at, subscription_status
FROM partners
WHERE email = 'flumedining@gmail.com';
