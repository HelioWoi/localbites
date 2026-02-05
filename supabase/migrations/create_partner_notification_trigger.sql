-- Create function to notify admin of new partner signups
CREATE OR REPLACE FUNCTION notify_new_partner()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to send notification
  PERFORM
    net.http_post(
      url := 'https://quybuvapflnzcaedjbkl.supabase.co/functions/v1/notify-new-partner',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := json_build_object(
        'record', row_to_json(NEW)
      )::jsonb
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on partners table
DROP TRIGGER IF EXISTS on_partner_created ON partners;

CREATE TRIGGER on_partner_created
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_partner();

-- Add comment
COMMENT ON FUNCTION notify_new_partner() IS 'Sends email notification to admin when new partner signs up';
