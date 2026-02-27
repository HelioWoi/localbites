import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import PartnerAuth from './PartnerAuth';
import PartnerDashboard from './PartnerDashboard';

export type PartnerUser = {
  id: string;
  email: string;
  restaurant_id?: string;
  restaurant_name?: string;
  plan: 'trial' | 'pro';
  trial_ends_at?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due';
};

const PartnerPortal: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<PartnerUser | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Don't override if admin is impersonating
      const isImpersonating = localStorage.getItem('admin_impersonate_partner_id');
      if (isImpersonating) {
        console.log('Ignoring auth state change - admin is impersonating');
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[PartnerPortal] SIGNED_IN event');
        console.log('[PartnerPortal] Session:', session);
        console.log('[PartnerPortal] User metadata:', session.user.app_metadata);
        
        // Check if this was a magic link login
        const amr = session.user.app_metadata?.amr;
        console.log('[PartnerPortal] AMR:', amr);
        
        const isMagicLink = amr && amr.some((m: any) => m.method === 'otp');
        console.log('[PartnerPortal] Is magic link?', isMagicLink);
        
        if (isMagicLink) {
          console.log('[PartnerPortal] ✅ Magic link login detected - showing welcome modal');
          // Show welcome modal immediately, don't load dashboard yet
          setShowWelcomeModal(true);
          setIsLoading(false);
          // Store user data but don't set it yet (will set after modal is closed)
          sessionStorage.setItem('pending_user_id', session.user.id);
          sessionStorage.setItem('pending_user_email', session.user.email || '');
          console.log('[PartnerPortal] Welcome modal state set to true');
        } else {
          console.log('[PartnerPortal] Normal login - loading user data');
          // Normal login, load user data
          await loadUserData(session.user.id, session.user.email || '');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    console.log('[PartnerPortal] Checking session...');
    try {
      // Check if this is a password recovery flow
      const fullHash = window.location.hash;
      const hashParams = new URLSearchParams(fullHash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const isRecovery = type === 'recovery' || (accessToken && fullHash.includes('type=recovery'));
      
      if (isRecovery) {
        console.log('[PartnerPortal] Recovery flow detected - not loading user data');
        // Don't load user data, let PartnerAuth handle the recovery
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Check if admin is impersonating a partner
      const impersonatePartnerId = localStorage.getItem('admin_impersonate_partner_id');
      const impersonatePartnerEmail = localStorage.getItem('admin_impersonate_partner_email');
      
      if (impersonatePartnerId && impersonatePartnerEmail) {
        // Load impersonated partner data
        console.log('[PartnerPortal] Admin impersonating partner:', impersonatePartnerEmail);
        setUser({
          id: impersonatePartnerId,
          email: impersonatePartnerEmail,
          plan: 'trial',
        });
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      console.log('[PartnerPortal] Session:', session);
      
      if (session?.user) {
        // Check if this was a magic link login
        const amr = session.user.app_metadata?.amr;
        console.log('[PartnerPortal] AMR:', amr);
        
        const isMagicLink = amr && amr.some((m: any) => m.method === 'otp');
        console.log('[PartnerPortal] Is magic link?', isMagicLink);
        
        if (isMagicLink) {
          console.log('[PartnerPortal] ✅ Magic link login detected in checkSession - showing welcome modal');
          // Show welcome modal immediately
          setShowWelcomeModal(true);
          setIsLoading(false);
          // Store user data but don't set it yet
          sessionStorage.setItem('pending_user_id', session.user.id);
          sessionStorage.setItem('pending_user_email', session.user.email || '');
          return;
        }
        
        await loadUserData(session.user.id, session.user.email || '');
      } else {
        console.log('[PartnerPortal] No session found');
      }
    } catch (error) {
      console.error('[PartnerPortal] Session check error:', error);
    }
    // Always set loading to false after everything completes
    setIsLoading(false);
  };

  const loadUserData = async (userId: string, email: string) => {
    // Set user immediately - partner data will be loaded in Dashboard
    setUser({
      id: userId,
      email,
      plan: 'trial',
    });
  };

  const handleLogout = async () => {
    // Clear admin impersonation data
    localStorage.removeItem('admin_impersonate_partner_id');
    localStorage.removeItem('admin_impersonate_partner_email');
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show welcome modal immediately after magic link login
  if (showWelcomeModal) {
    return (
      <div className="min-h-screen bg-zinc-50 backdrop-blur-md flex items-center justify-center relative">
        {/* Blurred background */}
        <div className="absolute inset-0 bg-zinc-100/80 backdrop-blur-lg"></div>
        
        {/* Welcome Modal */}
        <div className="relative z-10 bg-white rounded-2xl shadow-xl max-w-md w-full p-6 mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Welcome back!</h2>
            <p className="text-sm text-zinc-600 mb-6">
              You're now logged in. For security, we recommend changing your password.
            </p>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  // Load user data and close modal
                  const userId = sessionStorage.getItem('pending_user_id');
                  const userEmail = sessionStorage.getItem('pending_user_email');
                  
                  if (userId && userEmail) {
                    sessionStorage.removeItem('pending_user_id');
                    sessionStorage.removeItem('pending_user_email');
                    sessionStorage.setItem('show_password_modal', 'true');
                    await loadUserData(userId, userEmail);
                  }
                  
                  setShowWelcomeModal(false);
                }}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Change Password Now
              </button>
              <button
                onClick={async () => {
                  // Load user data and close modal
                  const userId = sessionStorage.getItem('pending_user_id');
                  const userEmail = sessionStorage.getItem('pending_user_email');
                  
                  if (userId && userEmail) {
                    sessionStorage.removeItem('pending_user_id');
                    sessionStorage.removeItem('pending_user_email');
                    await loadUserData(userId, userEmail);
                  }
                  
                  setShowWelcomeModal(false);
                }}
                className="w-full px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                I'll do it later
              </button>
            </div>

            <p className="text-xs text-zinc-500 text-center mt-4">
              You can change your password anytime from Settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PartnerAuth onAuthSuccess={() => checkSession()} />;
  }

  return <PartnerDashboard user={user} onLogout={handleLogout} />;
};

export default PartnerPortal;
