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
  const [businessIdType, setBusinessIdType] = useState<'ABN' | 'ACN'>('ABN');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoValidation, setPromoValidation] = useState<{ valid: boolean; type?: string; error?: string } | null>(null);

  const handleVerifyABN = async () => {
    const cleanValue = abn.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const expectedLength = businessIdType === 'ABN' ? 11 : 9;
    if (cleanValue.length !== expectedLength) return;
    if (!restaurantName.trim()) {
      setError(`Please enter your restaurant name first to verify ${businessIdType}`);
      return;
    }
    
    setIsVerifying(true);
    setVerificationResult(null);
    setError('');
    
    try {
      const result = await verifyABN(abn, restaurantName, businessIdType);
      setVerificationResult(result);
    } catch (err) {
      setVerificationResult({ isValid: false, message: 'Error verifying ABN' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleABNChange = (value: string) => {
    if (businessIdType === 'ABN') {
      const formatted = formatABN(value);
      setAbn(formatted);
    } else {
      // ACN: 9 digits, format as XXX XXX XXX
      const clean = value.replace(/\s/g, '').replace(/[^0-9]/g, '').slice(0, 9);
      const parts = [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 9)].filter(Boolean);
      setAbn(parts.join(' '));
    }
    setVerificationResult(null);
  };

  const handleToggleBusinessIdType = () => {
    const newType = businessIdType === 'ABN' ? 'ACN' : 'ABN';
    setBusinessIdType(newType);
    setAbn('');
    setVerificationResult(null);
  };

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
    if (!email.trim() || !password.trim() || !restaurantName.trim() || !address.trim() || !postalCode.trim() || !phone.trim()) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate promo code if provided
      let hasLifetimeAccess = false;
      if (promoCode.trim()) {
        const { data: promoResult } = await supabase.functions.invoke('validate-promo-code', {
          body: { code: promoCode.trim() }
        });
        
        if (promoResult?.valid && promoResult.type === 'lifetime') {
          hasLifetimeAccess = true;
        }
      }

      // Save signup data to localStorage in case email confirmation is required
      localStorage.setItem('pending_partner_signup', JSON.stringify({
        restaurant_name: restaurantName.trim(),
        abn: abn.trim() || null,
        address: address.trim(),
        postal_code: postalCode.trim(),
        phone: phone.trim(),
        website: website.trim() || null,
        hasLifetimeAccess,
        promoCode: promoCode.trim() || null,
      }));

      // Create Supabase auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      
      // If email confirmation is disabled, user is automatically logged in
      if (data.user && data.session) {
        // Auto-geocode address to get lat/lng via Google Geocoding API
        let latitude: number | null = null;
        let longitude: number | null = null;
        try {
          const { data: geoData } = await supabase.functions.invoke('google-places', {
            body: { action: 'geocode', query: `${address.trim()}, ${postalCode.trim()}, Australia` }
          });
          if (geoData?.lat && geoData?.lng) {
            latitude = geoData.lat;
            longitude = geoData.lng;
          }
        } catch (geoErr) {
          console.warn('[Geocode] Failed, continuing without coordinates:', geoErr);
        }

        // Create partner record with all business info
        await supabase.from('partners').insert({
          id: data.user.id,
          email: email.trim(),
          restaurant_name: restaurantName.trim(),
          abn: abn.trim() || null,
          address: address.trim(),
          postal_code: postalCode.trim(),
          phone: phone.trim(),
          website: website.trim() || null,
          latitude,
          longitude,
          plan: hasLifetimeAccess ? 'lifetime' : 'trial',
          trial_ends_at: hasLifetimeAccess ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'active',
          lifetime_access: hasLifetimeAccess,
          is_verified: false, // Manual verification for now
        });

        // Record promo code usage if valid
        if (hasLifetimeAccess && promoCode.trim()) {
          const { data: promoData } = await supabase
            .from('promo_codes')
            .select('id')
            .eq('code', promoCode.trim().toUpperCase())
            .single();
          
          if (promoData) {
            await supabase.from('promo_code_usage').insert({
              promo_code_id: promoData.id,
              partner_id: data.user.id
            });
            
            // Increment usage count
            await supabase.rpc('increment_promo_usage', { promo_id: promoData.id });
          }
        }

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
            <span className="text-xl font-bold text-zinc-900">Local Bites</span>
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
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Restaurant name
                      </label>
                      <div className="relative">
                        <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          placeholder="Your restaurant name"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        {businessIdType}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            value={abn}
                            onChange={(e) => handleABNChange(e.target.value)}
                            placeholder={businessIdType === 'ABN' ? '12 345 678 901' : '123 456 789'}
                            maxLength={businessIdType === 'ABN' ? 14 : 11}
                            className={`w-full pl-12 pr-4 py-3 bg-zinc-50 border rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                              verificationResult?.isValid ? 'border-emerald-400 bg-emerald-50/50' : 
                              verificationResult && !verificationResult.isValid ? 'border-red-300 bg-red-50/50' : 
                              'border-zinc-200'
                            }`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyABN}
                          disabled={(() => { const clean = abn.replace(/\s/g, '').replace(/[^0-9]/g, ''); return clean.length !== (businessIdType === 'ABN' ? 11 : 9); })() || isVerifying || !restaurantName.trim()}
                          className="px-4 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          Verify
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBusinessIdType}
                        className="mt-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                      >
                        {businessIdType === 'ABN' ? 'Have an ACN instead? Click here' : 'Have an ABN instead? Click here'}
                      </button>
                      {/* Verification Result */}
                      {verificationResult && (
                        <div className={`mt-2 p-3 rounded-lg text-sm ${
                          verificationResult.isValid 
                            ? 'bg-emerald-50 border border-emerald-200' 
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          {verificationResult.isValid ? (
                            <div className="flex items-start gap-2">
                              <CheckCircle size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-emerald-800">{businessIdType} Verified</p>
                                <p className="text-emerald-700 text-xs mt-0.5">{verificationResult.businessName}</p>
                                <p className="text-emerald-600 text-xs">{verificationResult.entityType} • {verificationResult.isActive ? 'Active' : 'Inactive'}{verificationResult.gst ? ' • GST Registered' : ''}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-red-800">Verification Failed</p>
                                <p className="text-red-700 text-xs mt-0.5">{verificationResult.message}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Your address"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Postal code
                      </label>
                      <div className="relative">
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="4557"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9+]/g, '');
                            setPhone(value);
                          }}
                          placeholder="+61 400 000 000"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Website <span className="text-zinc-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="www.yourrestaurant.com.au"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-2">
                        Promo code <span className="text-zinc-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="Enter promo code"
                          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all uppercase"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-2">
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
                    <label className="block text-xs font-medium text-zinc-500 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? 'Minimum 6 characters' : '••••••••'}
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
                <li>• Appear in Local Bites feed</li>
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
