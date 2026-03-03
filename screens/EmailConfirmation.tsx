import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const EmailConfirmation: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      // Get token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid confirmation link');
        return;
      }

      try {
        // Find partner by token
        const { data: partner, error: fetchError } = await supabase
          .from('partners')
          .select('*')
          .eq('email_confirmation_token', token)
          .single();

        if (fetchError || !partner) {
          setStatus('error');
          setMessage('Invalid or expired confirmation link');
          return;
        }

        // Check if already confirmed
        if (partner.email_confirmed) {
          setStatus('success');
          setRestaurantName(partner.restaurant_name);
          setMessage('Your email is already confirmed!');
          setTimeout(() => window.location.href = '/partner/login', 3000);
          return;
        }

        // Check if token expired
        const expiresAt = new Date(partner.email_confirmation_expires_at);
        if (expiresAt < new Date()) {
          setStatus('expired');
          setMessage('This confirmation link has expired. Please request a new one.');
          return;
        }

        // Update partner to mark email as confirmed
        const { error: updateError } = await supabase
          .from('partners')
          .update({
            email_confirmed: true,
            email_confirmation_token: null,
            email_confirmation_sent_at: null,
            email_confirmation_expires_at: null,
          })
          .eq('id', partner.id);

        if (updateError) {
          console.error('Error confirming email:', updateError);
          setStatus('error');
          setMessage('Failed to confirm email. Please try again.');
          return;
        }

        // Success!
        setStatus('success');
        setRestaurantName(partner.restaurant_name);
        setMessage('Email confirmed successfully!');

        // Redirect to login after 3 seconds
        setTimeout(() => window.location.href = '/partner/login', 3000);

      } catch (error) {
        console.error('Error confirming email:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    confirmEmail();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 size={40} className="text-orange-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={40} className="text-green-600" />
              </div>
            )}
            {(status === 'error' || status === 'expired') && (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={40} className="text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            {status === 'loading' && 'Confirming your email...'}
            {status === 'success' && `Welcome, ${restaurantName}!`}
            {status === 'error' && 'Confirmation Failed'}
            {status === 'expired' && 'Link Expired'}
          </h1>

          {/* Message */}
          <p className="text-zinc-600 mb-6">
            {message}
          </p>

          {/* Actions */}
          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                Redirecting to login in 3 seconds...
              </p>
              <button
                onClick={() => window.location.href = '/partner/login'}
                className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/partner/login'}
                className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
              >
                Request New Link
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/partner/login'}
                className="w-full px-6 py-3 bg-zinc-600 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Need help? Contact us at{' '}
              <a href="mailto:contact@menulove.com.au" className="text-orange-600 hover:underline">
                contact@menulove.com.au
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
