import React, { useEffect, useState } from 'react';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AffiliateAuthProps {
  onAuthSuccess: () => void;
  initialMode?: 'login' | 'signup' | 'forgot' | 'reset';
}

const AffiliateAuth: React.FC<AffiliateAuthProps> = ({ onAuthSuccess, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccess('');
  }, [initialMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) throw authError;

      if (!data.user) throw new Error('Login failed');

      // Verify this user is an affiliate
      const { data: affiliate, error: affError } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('auth_user_id', data.user.id)
        .single();

      if (affError || !affiliate) {
        if (affError?.message?.toLowerCase().includes('relation') || affError?.message?.toLowerCase().includes('does not exist')) {
          await supabase.auth.signOut();
          throw new Error('Affiliate system is not fully configured in database yet. Please run the latest Supabase migrations.');
        }
        await supabase.auth.signOut();
        throw new Error('No affiliate account found for this email. Please sign up first.');
      }

      if (affiliate.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Your affiliate account has been suspended. Please contact support.');
      }

      onAuthSuccess();
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid login credentials. If this is your first time, click Sign Up to create your affiliate account.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully. Redirecting...');
      setTimeout(() => {
        onAuthSuccess();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!name.trim()) throw new Error('Name is required');
      if (!email.trim()) throw new Error('Email is required');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');

      const normalizedEmail = email.trim().toLowerCase();

      // Check if affiliate already exists
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existing) {
        throw new Error('An affiliate account with this email already exists. Please login.');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { role: 'affiliate', name: name.trim() }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // Generate referral code via RPC
      const { data: refCode, error: refError } = await supabase.rpc('generate_referral_code', {
        affiliate_name: name.trim()
      });

      if (refError) {
        console.error('Referral code generation error:', refError);
        throw new Error('Failed to generate referral code');
      }

      // Create affiliate record
      const { error: insertError } = await supabase
        .from('affiliates')
        .insert({
          email: normalizedEmail,
          name: name.trim(),
          phone: phone.trim() || null,
          referral_code: refCode,
          auth_user_id: authData.user.id,
          status: 'active',
        });

      if (insertError) {
        console.error('Affiliate insert error:', insertError);
        if (insertError.message?.toLowerCase().includes('row-level security')) {
          throw new Error('Affiliate signup is blocked by database policy. Please apply the latest affiliate RLS migration.');
        }
        throw new Error('Failed to create affiliate account: ' + insertError.message);
      }

      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/affiliate#type=recovery`,
      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
            alt="MenuLove" 
            className="w-16 h-16 rounded-2xl mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Affiliate Program</h1>
          <p className="text-sm text-zinc-500">Earn commissions by referring restaurants</p>
        </div>

        {/* Tab switcher */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="flex bg-zinc-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                mode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={20} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
            >
              Forgot password?
            </button>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                placeholder="John Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder="04XX XXX XXX"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <><Loader2 size={20} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 text-center mb-2">Reset Password</h3>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 text-center mb-2">Set New Password</h3>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Repeat your new password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={isResettingPassword}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResettingPassword ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
            >
              Back to sign in
            </button>
          </form>
        )}

        {/* Commission info */}
        <div className="mt-6 pt-5 border-t border-zinc-200">
          <h4 className="text-zinc-900 text-sm font-bold mb-3">Commission Structure</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-600 text-xs">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              <span><strong className="text-zinc-900">$39</strong> for the first payment of each referral</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600 text-xs">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              <span><strong className="text-zinc-900">25%</strong> recurring commission for 6 months</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-600 text-xs">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              <span>Get your unique link after signing up</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AffiliateAuth;
