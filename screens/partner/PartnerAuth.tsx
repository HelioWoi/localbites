import React, { useState, useEffect } from 'react';
import { Utensils, Mail, Lock, ArrowRight, CheckCircle, Loader2, Eye, EyeOff, Building2, Hash, AlertCircle, MapPin, Phone, Globe, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { verifyABN, formatABN, isValidABNFormat } from '../../services/abnVerification';

interface PartnerAuthProps {
  onAuthSuccess: () => void;
}

const PartnerAuth: React.FC<PartnerAuthProps> = ({ onAuthSuccess }) => {
  // Check for password recovery token BEFORE initializing state
  const fullHash = window.location.hash;
  const hashParams = new URLSearchParams(fullHash.substring(1));
  const typeParam = hashParams.get('type');
  const accessToken = hashParams.get('access_token');
  // Check for recovery in multiple ways: type=recovery, #reset, or access_token with recovery
  const isRecovery = typeParam === 'recovery' || 
                     fullHash === '#reset' || 
                     (accessToken && fullHash.includes('type=recovery'));
  
  console.log('=== [PartnerAuth] Recovery Detection ===');
  console.log('Full URL:', window.location.href);
  console.log('Hash:', fullHash);
  console.log('Type param:', typeParam);
  console.log('Access token exists?', !!accessToken);
  console.log('Is recovery?', isRecovery);
  
  // Check if coming from demo CTA (step=2)
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  const isFromDemo = stepParam === '2';
  
  console.log('Initial mode will be:', isRecovery ? 'reset-password' : isFromDemo ? 'signup' : 'login');
  
  const [mode, setMode] = useState<'login' | 'signup' | 'magic' | 'sent' | 'reset-password'>(
    isRecovery ? 'reset-password' : isFromDemo ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  // Track if user came from landing page
  const [isFromLandingPage, setIsFromLandingPage] = useState(false);
  const [showEmailNotConfirmedWarning, setShowEmailNotConfirmedWarning] = useState(false);
  
  // Forgot password modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showMagicLinkSentModal, setShowMagicLinkSentModal] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');

  // Listen for auth events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[PartnerAuth] Auth event:', event, 'Current mode:', mode);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[PartnerAuth] Password recovery event detected - switching to reset mode');
        setMode('reset-password');
      }
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[PartnerAuth] SIGNED_IN event - session:', session);
        console.log('[PartnerAuth] User metadata:', session.user.app_metadata);
        console.log('[PartnerAuth] AMR:', session.user.app_metadata?.amr);
        
        // Don't trigger onAuthSuccess if we're in signup or sent mode (email confirmation flow)
        if (mode === 'signup' || mode === 'sent') {
          console.log('[PartnerAuth] Ignoring SIGNED_IN during signup/sent mode');
          return;
        }
        
        // Check if this was a magic link login (OTP)
        const amr = session.user.app_metadata?.amr;
        const isMagicLink = amr && amr.some((m: any) => m.method === 'otp');
        
        console.log('[PartnerAuth] Is magic link?', isMagicLink);
        
        if (isMagicLink) {
          console.log('[PartnerAuth] Magic link login detected - setting sessionStorage');
          sessionStorage.setItem('magic_link_login', 'true');
          console.log('[PartnerAuth] sessionStorage set:', sessionStorage.getItem('magic_link_login'));
        }
        
        onAuthSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthSuccess, mode]);

  // Pre-fill form with data from landing page (Step 1)
  useEffect(() => {
    // Check for email_not_confirmed parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('email_not_confirmed') === 'true') {
      setShowEmailNotConfirmedWarning(true);
      // Clean URL
      window.history.replaceState({}, '', '/partner/login');
    }

    // If we're in recovery mode, don't do anything else
    if (isRecovery) {
      console.log('[PartnerAuth] In recovery mode, skipping pre-fill');
      return; // Don't pre-fill or change mode if recovering password
    }

    const savedData = sessionStorage.getItem('partnerSignupStep1');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        if (data.restaurantName) setRestaurantName(data.restaurantName);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.address) setAddress(data.address);
        // Auto-switch to signup mode if coming from landing page
        setMode('signup');
        setIsFromLandingPage(true);
        
        // Clear admin impersonation ONLY when coming from landing page signup
        localStorage.removeItem('admin_impersonate_partner_id');
        localStorage.removeItem('admin_impersonate_partner_email');
      } catch (err) {
        console.error('Error loading signup data:', err);
      }
    }
  }, []);

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
    
    // Require ABN or ACN
    if (!abn.trim()) {
      setError(`Please enter your ${businessIdType}`);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Set flag to prevent PartnerPortal from loading during signup
      sessionStorage.setItem('signup_in_progress', 'true');
      
      // CRITICAL: Sign out any existing session before creating new account
      await supabase.auth.signOut();
      console.log('[Signup] Signed out any existing session');
      

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

      // Generate confirmation token
      const confirmationToken = crypto.randomUUID();
      const confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create Supabase auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;
      
      // Create partner record immediately with email_confirmed = false
      if (data.user) {
        // Auto-geocode address to get lat/lng via Google Places API
        let latitude: number | null = null;
        let longitude: number | null = null;
        let googlePlaceId: string | null = null;
        let googleMapsUrl: string | null = null;
        
        try {
          const { textSearchRestaurants } = await import('../../services/googlePlacesProxy');
          // Use Sunshine Coast center as search origin
          const results = await textSearchRestaurants(
            -26.6833,
            153.0667,
            50000, // 50km radius
            `${restaurantName.trim()} ${address.trim()}`
          );
          
          if (results.length > 0) {
            const place = results[0];
            latitude = place.location.lat;
            longitude = place.location.lng;
            googlePlaceId = place.id;
            googleMapsUrl = place.googleMapsUrl;
            console.log('[Auto-geocoding] ✓ Signup - Found coordinates:', {
              name: restaurantName.trim(),
              lat: latitude,
              lng: longitude
            });
          }
        } catch (geoErr) {
          console.warn('[Auto-geocoding] ✗ Signup - Failed, continuing without coordinates:', geoErr);
        }

        // Create partner record with all business info
        // Generate unique slug with timestamp to avoid conflicts
        const baseSlug = restaurantName.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

        const partnerData = {
          id: data.user.id,
          email: email.trim(),
          restaurant_name: restaurantName.trim(),
          abn: abn.trim() ? abn.trim().replace(/\s/g, '') : null,
          address: address.trim(),
          postal_code: postalCode.trim().replace(/\s/g, ''),
          phone: phone.trim().replace(/\s/g, ''),
          website: website.trim() || null,
          latitude,
          longitude,
          google_place_id: googlePlaceId,
          google_maps_url: googleMapsUrl,
          slug: uniqueSlug,
          plan: hasLifetimeAccess ? 'lifetime' : 'trial',
          trial_ends_at: hasLifetimeAccess ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'active',
          lifetime_access: hasLifetimeAccess,
          is_verified: false,
          email_confirmed: false,
          email_confirmation_token: confirmationToken,
          email_confirmation_sent_at: new Date().toISOString(),
          email_confirmation_expires_at: confirmationExpiresAt.toISOString(),
        };
        
        console.log('[Signup] Creating/updating partner with unique slug:', uniqueSlug);
        
        // Use upsert to handle case where partner already exists
        const { error: upsertError } = await supabase
          .from('partners')
          .upsert(partnerData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });
          
        if (upsertError) {
          console.error('[Signup] Error creating/updating partner:', upsertError);
          throw upsertError;
        }

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

        // Track affiliate referral if present
        const affiliateRefCode = localStorage.getItem('affiliate_ref_code');
        const affiliateRefTimestamp = localStorage.getItem('affiliate_ref_timestamp');
        if (affiliateRefCode) {
          try {
            // Check ref code is not older than 30 days
            const isValid = affiliateRefTimestamp && (Date.now() - parseInt(affiliateRefTimestamp)) < 30 * 24 * 60 * 60 * 1000;
            if (isValid) {
              const { data: affiliateData } = await supabase
                .from('affiliates')
                .select('id')
                .eq('referral_code', affiliateRefCode)
                .eq('status', 'active')
                .single();

              if (affiliateData) {
                // Create referral record
                await supabase.from('referrals').insert({
                  affiliate_id: affiliateData.id,
                  partner_id: data.user.id,
                  partner_email: email.trim(),
                  status: 'signed_up',
                  signed_up_at: new Date().toISOString(),
                });

                // Update partner with affiliate reference
                await supabase
                  .from('partners')
                  .update({ referred_by_affiliate_id: affiliateData.id })
                  .eq('id', data.user.id);

                // Update affiliate totals
                await supabase.rpc('update_affiliate_totals', { aff_id: affiliateData.id });

                console.log('[Signup] Affiliate referral tracked:', affiliateRefCode, '->', affiliateData.id);
              }
            }
            // Clear ref code after use
            localStorage.removeItem('affiliate_ref_code');
            localStorage.removeItem('affiliate_ref_timestamp');
          } catch (refErr) {
            console.warn('[Signup] Affiliate referral tracking failed (non-blocking):', refErr);
          }
        }

        // Send confirmation email
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-confirmation-email', {
            body: {
              email: email.trim(),
              restaurantName: restaurantName.trim(),
              confirmationToken
            }
          });
          
          if (emailError) {
            console.error('[Signup] Failed to send confirmation email:', emailError);
            console.log('🔗 CONFIRMATION LINK (for testing):', `${window.location.origin}/confirm-email?token=${confirmationToken}`);
          } else {
            console.log('[Signup] Confirmation email sent successfully');
          }
        } catch (emailError) {
          console.error('[Signup] Email sending error:', emailError);
          console.log('🔗 CONFIRMATION LINK (for testing):', `${window.location.origin}/confirm-email?token=${confirmationToken}`);
        }

        // Sign out user and show confirmation message
        await supabase.auth.signOut();
        sessionStorage.removeItem('signup_in_progress');
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) return;

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[Reset Password] Attempting to update password...');
      
      // Check current session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[Reset Password] Current session:', sessionData.session ? 'exists' : 'missing');
      console.log('[Reset Password] Session user:', sessionData.session?.user?.email);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[Reset Password] Update error:', error);
        throw error;
      }

      console.log('[Reset Password] Password updated successfully!');
      alert('Password updated successfully!');
      window.location.href = '/partner';
    } catch (err: any) {
      console.error('[Reset Password] Failed:', err);
      setError(err.message || 'Failed to update password. Please try requesting a new reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'reset-password') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="pt-16 pb-8 flex items-center justify-center">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-12 h-12 rounded-xl"
            />
            <div>
              <span className="text-xl font-bold text-zinc-900">MenuLove™</span>
              <span className="text-xl font-light text-zinc-400 ml-1">Partner</span>
            </div>
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
              <h1 className="text-2xl font-bold text-zinc-900 mb-1">Reset your password</h1>
              <p className="text-zinc-500 mb-6">Enter your new password below</p>

              <form onSubmit={handleResetPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-2">
                      New password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
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

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-2">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

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
                        Update password
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="font-semibold text-zinc-900 mb-4">{email}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-orange-900 font-medium mb-2">
              📧 Click the link in your email to confirm and start your 30-day free trial!
            </p>
            <p className="text-xs text-orange-700">
              The link expires in 24 hours. Check your spam folder if you don't see it.
            </p>
          </div>
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

      {/* Content - centered vertically */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
            {isFromLandingPage && mode === 'signup' && (
              <div className="mb-4 flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-600">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs">2</div>
                  <span>Step 2 of 2</span>
                </div>
                <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-full"></div>
                </div>
              </div>
            )}
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">
              {mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Magic link login' : 'Welcome back'}
            </h1>
            <p className="text-zinc-500 mb-6">
              {mode === 'signup' 
                ? (isFromLandingPage ? 'Complete your registration' : 'Start your 30-day free trial')
                : mode === 'magic' 
                  ? 'We\'ll send you a login link'
                  : 'Sign in to manage your restaurant'}
            </p>

            {/* Email Not Confirmed Warning */}
            {showEmailNotConfirmedWarning && mode === 'login' && (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900 mb-1">
                      Email confirmation required
                    </p>
                    <p className="text-xs text-orange-700">
                      Please check your inbox and click the confirmation link to access your dashboard.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEmailNotConfirmedWarning(false)}
                    className="text-orange-400 hover:text-orange-600 ml-auto"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

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
                        {businessIdType} <span className="text-red-500">*</span>
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
                            required
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
                      {mode === 'signup' ? 'Create My Video Menu' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
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
                    type="button"
                    onClick={() => {
                      setShowForgotPasswordModal(true);
                      setForgotPasswordEmail(email);
                    }}
                    className="w-full text-center text-sm text-orange-500 font-medium hover:underline"
                  >
                    Forgot password?
                  </button>
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

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setForgotPasswordEmail('');
                  setError('');
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-zinc-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="your@email.com"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
                      setError('Please enter a valid email address');
                      return;
                    }
                    setIsSendingReset(true);
                    setError('');
                    try {
                      // Use magic link with shouldCreateUser: false to only allow existing users
                      const { error } = await supabase.auth.signInWithOtp({
                        email: forgotPasswordEmail,
                        options: {
                          shouldCreateUser: false,
                          emailRedirectTo: `${window.location.origin}/partner`,
                        }
                      });
                      if (error) throw error;
                      
                      // Show success modal instead of alert
                      setSentToEmail(forgotPasswordEmail);
                      setShowForgotPasswordModal(false);
                      setShowMagicLinkSentModal(true);
                      setForgotPasswordEmail('');
                    } catch (err: any) {
                      setError(err.message || 'Failed to send login link');
                    } finally {
                      setIsSendingReset(false);
                    }
                  }}
                  disabled={isSendingReset}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSendingReset ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Magic Link Sent Success Modal */}
      {showMagicLinkSentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Check your email</h2>
              <p className="text-sm text-zinc-600 mb-2">
                We sent a login link to
              </p>
              <p className="font-semibold text-zinc-900 mb-6">{sentToEmail}</p>
              <p className="text-sm text-zinc-500 mb-6">
                Click the link in the email to sign in. After signing in, you can change your password from Settings.
              </p>
              <button
                onClick={() => {
                  setShowMagicLinkSentModal(false);
                  setSentToEmail('');
                }}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerAuth;
