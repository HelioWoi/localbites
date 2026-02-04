-- Delete partner and related data
DELETE FROM subscriptions WHERE partner_id IN (SELECT id FROM partners WHERE email = 'heliocwoi@gmail.com');
DELETE FROM payment_history WHERE partner_id IN (SELECT id FROM partners WHERE email = 'heliocwoi@gmail.com');
DELETE FROM partners WHERE email = 'heliocwoi@gmail.com';
