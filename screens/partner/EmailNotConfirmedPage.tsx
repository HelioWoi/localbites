import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const extractEdgeFunctionErrorMessage = (err: any): string => {
  if (err?.message && err.message !== 'Edge Function returned a non-2xx status code') {
    return err.message;
  }

  const context = err?.context;
  if (typeof context === 'string') {
    try {
      const parsed = JSON.parse(context) as { error?: string; message?: string };
      if (parsed.error || parsed.message) {
        return parsed.error || parsed.message || 'Failed to resend email. Please try again.';
      }
    } catch {
    }
  }

  return 'Failed to resend email. Please try again.';
};

const EmailNotConfirmedPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [confirmationChecked, setConfirmationChecked] = useState(false);
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
      const { data, error: resendError } = await supabase.functions.invoke('resend-confirmation-email', {
        body: { email },
      });

      if (resendError) {
        const detailedError = (data as { error?: string; message?: string } | null)?.error
          || (data as { error?: string; message?: string } | null)?.message
          || extractEdgeFunctionErrorMessage(resendError);
        throw new Error(detailedError);
      }

      setResendSuccess(true);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(extractEdgeFunctionErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleAlreadyConfirmed = async () => {
    if (!email) {
      setError('Email not found. Please login again.');
      return;
    }

    setIsCheckingConfirmation(true);
    setError('');
    setConfirmationChecked(false);

    try {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('email_confirmed')
        .eq('email', email)
        .maybeSingle();

      if (partnerError) {
        throw partnerError;
      }

      if (partner?.email_confirmed) {
        setConfirmationChecked(true);
        setTimeout(() => {
          window.location.href = '/partner/login?email_confirmed=true';
        }, 1000);
        return;
      }

      setError('Email is not confirmed yet. Please refresh your inbox and click the confirmation link.');
    } catch (err: any) {
      console.error('Confirmation check error:', err);
      setError('Unable to validate confirmation right now. Please try again in a few seconds.');
    } finally {
      setIsCheckingConfirmation(false);
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

            {confirmationChecked && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 mb-1">Email confirmed successfully</p>
                  <p className="text-sm text-green-700">Redirecting to login...</p>
                </div>
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

            <button
              onClick={handleAlreadyConfirmed}
              disabled={isCheckingConfirmation}
              className="w-full mt-3 bg-white border border-zinc-200 text-zinc-800 font-semibold py-3 rounded-xl hover:bg-zinc-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCheckingConfirmation ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Checking confirmation...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  I already confirmed
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
