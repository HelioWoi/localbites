-- Check the constraint on subscription_status
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'partners'::regclass 
AND conname = 'partners_subscription_status_check';
