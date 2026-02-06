import React, { useState } from 'react';
import { Utensils, Mail, Lock, ArrowRight, CheckCircle, Loader2, Eye, EyeOff, Building2, Hash, AlertCircle, MapPin, Phone, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { verifyABN, formatABN, isValidABNFormat } from '../../services/abnVerification';

interface PartnerAuthProps {
  onAuthSuccess: () => void;
}

const PartnerAuth: React.FC<PartnerAuthProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'magic' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ABN verification fields (only for signup)
  const [restaurantName, setRestaurantName] = useState('');
  const [abn, setAbn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !restaurantName.trim() || !address.trim() || !phone.trim()) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create Supabase auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      
      // If email confirmation is disabled, user is automatically logged in
      if (data.user && data.session) {
        // Create partner record with all business info
        await supabase.from('partners').insert({
          user_id: data.user.id,
          email: email.trim(),
          restaurant_name: restaurantName.trim(),
          abn: abn.trim() || null,
          address: address.trim(),
          phone: phone.trim(),
          website: website.trim() || null,
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'active',
          is_verified: false, // Manual verification for now
        });
        onAuthSuccess();
      } else {
        // Email confirmation required
        setMode('sent');
      }
    } catch (err: any) {
      // If user already exists, try to login
      if (err.message?.includes('already registered')) {
        setError('Account already exists. Please sign in.');
        setMode('login');
      } else {
        setError(err.message || 'Signup failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/partner`,
        },
      });

      if (error) throw error;
      setMode('sent');
    } catch (err: any) {
      setError(err.message || 'Failed to send link');
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'sent') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Check your email</h1>
          <p className="text-zinc-500 mb-2">
            We sent a confirmation link to
          </p>
          <p className="font-semibold text-zinc-900 mb-8">{email}</p>
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className="text-orange-500 font-semibold text-sm hover:underline"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header - better spacing */}
      <div className="pt-16 pb-8 flex items-center justify-center">
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Utensils size={20} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-zinc-900">LocalBites</span>
            <span className="text-xl font-light text-zinc-400 ml-1">Partner</span>
          </div>
        </a>
      </div>

      {/* Content - centered vertically */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">
              {mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Magic link login' : 'Welcome back'}
            </h1>
            <p className="text-zinc-500 mb-6">
              {mode === 'signup' 
                ? 'Start your 14-day free trial' 
                : mode === 'magic' 
                  ? 'We\'ll send you a login link'
                  : 'Sign in to manage your restaurant'}
            </p>

            <form onSubmit={mode === 'signup' ? handleSignup : mode === 'magic' ? handleMagicLink : handleEmailLogin}>
              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Restaurant Name
                      </label>
                      <div className="relative">
                        <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Your Restaurant Name"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        ABN (Australian Business Number)
                      </label>
                      <div className="relative">
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={abn}
                          onChange={(e) => setAbn(e.target.value)}
                          placeholder="XX XXX XXX XXX (Optional)"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="16 Smith Street, Mooloolaba, QLD"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+61 4XX XXX XXX"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yourrestaurant.com (Optional)"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@restaurant.com"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                {mode !== 'magic' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                        className="w-full pl-12 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-900">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'signup' ? 'Start free trial' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Mode switchers */}
            <div className="mt-6 pt-6 border-t border-zinc-100 space-y-3">
              {mode === 'login' && (
                <>
                  <button
                    onClick={() => { setMode('magic'); setError(''); }}
                    className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    Sign in with magic link instead
                  </button>
                  <p className="text-center text-sm text-zinc-500">
                    Don't have an account?{' '}
                    <button onClick={() => { setMode('signup'); setError(''); }} className="text-orange-500 font-semibold hover:underline">
                      Start free trial
                    </button>
                  </p>
                </>
              )}
              {mode === 'signup' && (
                <p className="text-center text-sm text-zinc-500">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); }} className="text-orange-500 font-semibold hover:underline">
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'magic' && (
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
                >
                  ← Back to password login
                </button>
              )}
            </div>
          </div>

          {/* Trial info */}
          {mode === 'signup' && (
            <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-800 font-medium mb-2">🎉 14-day free trial includes:</p>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Upload up to 5 menu videos</li>
                <li>• Basic analytics dashboard</li>
                <li>• Appear in LocalBites feed</li>
                <li>• No credit card required</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerAuth;
