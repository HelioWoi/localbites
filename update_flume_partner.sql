-- Update existing Flume by the River partner with 30 days trial

UPDATE partners
SET 
  restaurant_name = 'Flume by the River',
  address = '267 Bradman Ave, Maroochydore, Queensland 4558',
  phone = '0488 777 794',
  slug = 'flume-by-the-river',
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'active'
WHERE email = 'flumedining@gmail.com';

-- Verificar se foi atualizado
SELECT id, email, restaurant_name, address, phone, slug, trial_ends_at, subscription_status
FROM partners
WHERE email = 'flumedining@gmail.com';
