-- Query to check partner data
SELECT 
  id,
  email,
  name,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  subscription_plan,
  subscription_start_date,
  subscription_end_date
FROM partners
WHERE email = 'heliocwoi@gmail.com';
