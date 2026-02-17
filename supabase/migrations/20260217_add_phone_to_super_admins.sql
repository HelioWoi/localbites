-- Add phone number and SMS notification preferences to super_admins table
ALTER TABLE public.super_admins 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.super_admins.phone_number IS 'Phone number for SMS notifications (format: +61412345678)';
COMMENT ON COLUMN public.super_admins.sms_notifications_enabled IS 'Whether SMS notifications are enabled for this admin';
