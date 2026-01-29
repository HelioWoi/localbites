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

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserData(session.user.id, session.user.email || '');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (userId: string, email: string) => {
    try {
      // Get partner profile
      let { data: partner } = await supabase
        .from('partners')
        .select('*, restaurants(*)')
        .eq('user_id', userId)
        .single();

      if (partner) {
        setUser({
          id: userId,
          email,
          restaurant_id: partner.restaurant_id,
          restaurant_name: partner.restaurants?.name,
          plan: partner.plan || 'trial',
          trial_ends_at: partner.trial_ends_at,
          subscription_status: partner.subscription_status,
        });
      } else {
        // New user - create partner profile with trial
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);

        const { data: newPartner } = await supabase
          .from('partners')
          .insert({
            user_id: userId,
            email,
            plan: 'trial',
            trial_ends_at: trialEnds.toISOString(),
          })
          .select()
          .single();

        if (newPartner) {
          setUser({
            id: userId,
            email,
            plan: 'trial',
            trial_ends_at: newPartner.trial_ends_at,
          });
        }
      }
    } catch (error) {
      console.error('Load user error:', error);
      // Still set basic user info
      setUser({
        id: userId,
        email,
        plan: 'trial',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <PartnerAuth onAuthSuccess={checkSession} />;
  }

  return <PartnerDashboard user={user} onLogout={handleLogout} />;
};

export default PartnerPortal;
