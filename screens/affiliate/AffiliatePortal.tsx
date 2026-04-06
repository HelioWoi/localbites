import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AffiliateAuth from './AffiliateAuth';
import AffiliateDashboard from './AffiliateDashboard';

const AffiliatePortal: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'reset'>('login');
  const checkedRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('type=recovery')) {
      setAuthMode('reset');
      setIsLoading(false);
      setAffiliateId(null);
    }

    if (!checkedRef.current) {
      checkedRef.current = true;
      checkSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setAffiliateId(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setAuthMode('login');
        setAffiliateId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('type=recovery')) {
        setAuthMode('reset');
        setAffiliateId(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadAffiliateData(session.user.id);
      }
    } catch (error) {
      console.error('[AffiliatePortal] Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAffiliateData = async (authUserId: string) => {
    try {
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.warn('[AffiliatePortal] Could not load affiliate data:', error.message);
        setAffiliateId(null);
        return;
      }

      if (affiliate && affiliate.status !== 'suspended') {
        setAffiliateId(affiliate.id);
      } else {
        setAffiliateId(null);
      }
    } catch (err) {
      console.error('[AffiliatePortal] loadAffiliateData error:', err);
      setAffiliateId(null);
    }
  };

  const handleAuthSuccess = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadAffiliateData(session.user.id);
        setAuthMode('login');
      }
    } catch (err) {
      console.error('[AffiliatePortal] handleAuthSuccess error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setAffiliateId(null);
    window.location.href = '/affiliate';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!affiliateId) {
    return <AffiliateAuth onAuthSuccess={handleAuthSuccess} initialMode={authMode === 'reset' ? 'reset' : 'login'} />;
  }

  return <AffiliateDashboard affiliateId={affiliateId} onLogout={handleLogout} />;
};

export default AffiliatePortal;
