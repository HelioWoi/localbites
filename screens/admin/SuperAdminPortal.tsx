import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SuperAdminDashboardNew from './SuperAdminDashboardNew';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

const SuperAdminPortal: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('type=recovery')) {
      setAuthMode('reset');
      setError(null);
      setSuccess(null);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setError(null);
        setSuccess(null);
        setIsLoading(false);
      }
    });

    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('type=recovery')) {
        setAuthMode('reset');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Checking auth...');
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      console.log('👤 Current user:', currentUser);
      console.log('❌ User error:', userError);
      
      if (userError || !currentUser) {
        console.log('⚠️ No user found or error');
        setError('Please sign in to access the admin panel');
        setIsLoading(false);
        return;
      }

      const normalizedUserEmail = (currentUser.email || '').trim().toLowerCase();
      console.log('📧 User email:', normalizedUserEmail);

      // Check if user is a super admin
      const { data: superAdmin, error: adminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', normalizedUserEmail)
        .single();

      console.log('👑 Super admin data:', superAdmin);
      console.log('❌ Admin error:', adminError);

      if (adminError || !superAdmin) {
        console.log('⚠️ User is not a super admin');
        setError(`Unauthorized access. You do not have admin privileges. (Email: ${normalizedUserEmail})`);
        setIsLoading(false);
        return;
      }

      // User is authorized
      console.log('✅ User is authorized!');
      setUser(currentUser);
      setIsAuthorized(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      setError('An error occurred while checking authorization');
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError(null);
    setSuccess(null);

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
        window.location.href = '/admin';
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    setSuccess(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      // Sign in with email and password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoggingIn(false);
        return;
      }

      // Check if user is super admin
      const authEmail = (data.user?.email || normalizedEmail).trim().toLowerCase();
      const { data: superAdmin, error: adminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', authEmail)
        .single();

      if (adminError || !superAdmin) {
        await supabase.auth.signOut();
        setError('You do not have super admin privileges');
        setIsLoggingIn(false);
        return;
      }

      // Success - reload to show dashboard
      window.location.reload();
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter your email first to reset your password.');
      setSuccess(null);
      return;
    }

    setIsSendingReset(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/admin`,
      });

      if (resetError) throw resetError;

      setSuccess('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsSendingReset(false);
    }
  };

  const switchToForgot = () => {
    setAuthMode('forgot');
    setError(null);
    setSuccess(null);
  };

  const switchToLogin = () => {
    setAuthMode('login');
    setError(null);
    setSuccess(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (error || !isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
          <div className="text-center mb-8">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-16 h-16 rounded-2xl mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              {authMode === 'forgot' || authMode === 'reset' ? 'Reset Admin Password' : 'Super Admin Login'}
            </h1>
            <p className="text-sm text-zinc-500">
              {authMode === 'forgot'
                ? 'Enter your email to receive a reset link'
                : authMode === 'reset'
                  ? 'Create your new password below'
                  : 'Sign in to access the admin dashboard'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 text-center">{success}</p>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleDirectLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@menulove.com.au"
                  required
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={switchToForgot}
                className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
              >
                Forgot password?
              </button>
            </form>
          ) : authMode === 'forgot' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@menulove.com.au"
                  required
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingReset ? 'Sending reset email...' : 'Send Reset Email'}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isResettingPassword}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? 'Updating password...' : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full text-sm text-zinc-500 hover:text-orange-600 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          )}

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
  }

  return <SuperAdminDashboardNew user={user} onLogout={handleLogout} />;
};

export default SuperAdminPortal;
