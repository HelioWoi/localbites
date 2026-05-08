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
        const { data, error } = await supabase.functions.invoke('confirm-email', {
          body: { token },
        });

        if (error) {
          const messageFromContext = typeof error.context === 'string'
            ? (() => {
                try {
                  const parsed = JSON.parse(error.context) as { message?: string; error?: string };
                  return parsed.message || parsed.error;
                } catch {
                  return null;
                }
              })()
            : null;

          const fallbackMessage = (data as { message?: string; error?: string } | null)?.message
            || (data as { message?: string; error?: string } | null)?.error
            || messageFromContext
            || 'Failed to confirm email. Please try again.';

          if (fallbackMessage.toLowerCase().includes('expired')) {
            setStatus('expired');
            setMessage(fallbackMessage);
            return;
          }

          setStatus('error');
          setMessage(fallbackMessage);
          return;
        }

        const response = data as {
          status?: 'confirmed' | 'already_confirmed' | 'expired' | 'invalid';
          message?: string;
          restaurantName?: string;
          error?: string;
        } | null;

        if (!response) {
          setStatus('error');
          setMessage('Invalid confirmation response');
          return;
        }

        if (response.status === 'already_confirmed') {
          setStatus('success');
          setRestaurantName(response.restaurantName || '');
          setMessage(response.message || 'Your email is already confirmed!');
          setTimeout(() => window.location.href = '/partner/login', 3000);
          return;
        }

        if (response.status === 'expired') {
          setStatus('expired');
          setMessage(response.message || 'This confirmation link has expired. Please request a new one.');
          return;
        }

        if (response.status === 'invalid') {
          setStatus('error');
          setMessage(response.message || 'Invalid or expired confirmation link');
          return;
        }

        // Success!
        setStatus('success');
        setRestaurantName(response.restaurantName || '');
        setMessage(response.message || 'Email confirmed successfully!');

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
