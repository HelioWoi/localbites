import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const EmailNotConfirmedPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get email from URL params
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email not found. Please login again.');
      return;
    }

    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const { error: resendError } = await supabase.functions.invoke('resend-confirmation-email', {
        body: { email },
      });

      if (resendError) throw resendError;

      setResendSuccess(true);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 flex items-center justify-center">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
            alt="MenuLove" 
            className="w-12 h-12 rounded-xl"
          />
          <div>
            <span className="text-xl font-bold text-zinc-900">MenuLove</span>
            <span className="text-xl font-light text-zinc-400 ml-1">Partner</span>
          </div>
        </a>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail size={32} className="text-orange-500" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-zinc-900 mb-2 text-center">
              Confirm your email
            </h1>

            {/* Description */}
            <p className="text-zinc-600 text-center mb-6">
              Your account was created successfully, but you haven't confirmed your email yet.
            </p>

            {/* Email Display */}
            {email && (
              <div className="bg-zinc-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-zinc-500 mb-1">Email sent to:</p>
                <p className="text-zinc-900 font-medium break-all">{email}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-900 leading-relaxed">
                Please check your inbox (and spam folder) and click the confirmation link we sent you.
              </p>
            </div>

            {/* Success Message */}
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">Email resent!</p>
                  <p className="text-sm text-green-700">
                    Check your inbox. It may take a few minutes to arrive.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}

            {/* Resend Button */}
            <button
              onClick={handleResendEmail}
              disabled={isResending || resendSuccess}
              className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResending ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Resending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle size={20} />
                  Email sent
                </>
              ) : (
                <>
                  <Mail size={20} />
                  Resend confirmation email
                </>
              )}
            </button>

            {/* Help Text */}
            <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
              <p className="text-sm text-zinc-500 mb-2">
                Didn't receive the email or having problems?
              </p>
              <a 
                href="mailto:contact@menulove.com.au" 
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                Contact us
              </a>
            </div>

            {/* Back to Login */}
            <div className="mt-4 text-center">
              <a 
                href="/partner/login" 
                className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                Back to login
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-zinc-400 text-sm">
          MenuLove - Video Menus & Smart Ordering
        </p>
        <p className="text-zinc-400 text-sm mt-1">
          Built with <span className="text-orange-500">🧡</span> in Australia
        </p>
      </footer>
    </div>
  );
};

export default EmailNotConfirmedPage;
