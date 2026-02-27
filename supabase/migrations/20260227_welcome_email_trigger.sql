-- Migration: Send welcome email when new partner signs up
-- Created: 2026-02-27
-- Purpose: Automatically send welcome email to new partners after signup

-- Create function to send welcome email
CREATE OR REPLACE FUNCTION send_partner_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Send welcome email via Supabase Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'email', NEW.email,
        'restaurant_name', NEW.restaurant_name,
        'trial_days', 30
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after partner insert
DROP TRIGGER IF EXISTS on_partner_created ON partners;
CREATE TRIGGER on_partner_created
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION send_partner_welcome_email();

COMMENT ON FUNCTION send_partner_welcome_email() IS 'Sends welcome email to new partners via Edge Function';
