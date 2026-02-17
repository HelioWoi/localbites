import { supabase } from '../lib/supabase';

interface SendSMSParams {
  to: string;
  message: string;
}

// Send SMS via Twilio Edge Function
export const sendSMS = async ({ to, message }: SendSMSParams): Promise<boolean> => {
  try {
    console.log('[SMS] Attempting to send SMS to:', to);
    console.log('[SMS] Message:', message);
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, message })
    });

    console.log('[SMS] Response status:', response.status);
    const data = await response.json();
    console.log('[SMS] Response data:', data);

    if (!response.ok) {
      console.error('[SMS] Error sending SMS:', data);
      return false;
    }

    if (data?.error) {
      console.error('[SMS] Twilio error:', data.error);
      return false;
    }

    console.log('[SMS] SMS sent successfully:', data);
    return true;
  } catch (error) {
    console.error('[SMS] Exception sending SMS:', error);
    return false;
  }
};

// Send visitor alert SMS
export const sendVisitorAlertSMS = async (phoneNumber: string, visitorCount: number): Promise<boolean> => {
  const message = `🟢 MenuLove Alert: ${visitorCount} ${visitorCount === 1 ? 'visitor is' : 'visitors are'} browsing your site right now!`;
  return await sendSMS({ to: phoneNumber, message });
};

// Send test SMS
export const sendTestSMS = async (phoneNumber: string): Promise<boolean> => {
  const message = '✅ MenuLove SMS notifications are working! You will receive alerts when visitors access your site.';
  return await sendSMS({ to: phoneNumber, message });
};

// Validate phone number format (basic validation)
export const isValidPhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  // Must start with + for international format
  return phone.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15;
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // If already formatted, return as is
  if (phone.startsWith('+')) return phone;
  
  // Add + prefix if missing
  return `+${phone.replace(/\D/g, '')}`;
};
