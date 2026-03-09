import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const AdminSetup: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('email, expires_at, used')
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation link');
        setIsLoading(false);
        return;
      }

      if (data.used) {
        setError('This invitation has already been used');
        setIsLoading(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError('This invitation has expired');
        setIsLoading(false);
        return;
      }

      setEmail(data.email);
      setTokenValid(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error validating token:', err);
      setError('Failed to validate invitation');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (authError) throw authError;

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('token', token);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/admin';
      }, 3000);

    } catch (err: any) {
      console.error('Error creating account:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-4">
            Account Created! 🎉
          </h1>
          <p className="text-zinc-600 mb-6">
            Your admin account has been successfully created.
          </p>
          <p className="text-sm text-zinc-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-4">
            Invalid Invitation
          </h1>
          <p className="text-zinc-600 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            Create Your Password
          </h1>
          <p className="text-zinc-600">
            Set up your admin account to get started
          </p>
        </div>

        {/* Email Display */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-orange-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-orange-700 font-medium mb-1">Your login email</p>
              <p className="text-sm text-orange-900 font-mono truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Minimum 8 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Confirm Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
              minLength={8}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account & Login'}
          </button>
        </form>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 font-medium mb-2">📝 After creating your account:</p>
          <ol className="text-xs text-blue-800 space-y-1 pl-4">
            <li>1. You'll be redirected to the login page</li>
            <li>2. Use your email and password to sign in</li>
            <li>3. Access the admin panel</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-orange-600">MenuLove</span>
            <br />
            <span className="text-xs">Video Menus & Smart Ordering</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
