-- Ativar lifetime access para heliocwoi@gmail.com
UPDATE partners 
SET lifetime_access = true 
WHERE email = 'heliocwoi@gmail.com';

-- Verificar se foi atualizado
SELECT email, lifetime_access, subscription_status, trial_ends_at 
FROM partners 
WHERE email = 'heliocwoi@gmail.com';
