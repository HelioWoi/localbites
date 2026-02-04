-- Check what values are allowed for subscription_status
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'partners' 
AND column_name = 'subscription_status';

-- Check constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'partners'::regclass 
AND conname LIKE '%subscription_status%';
