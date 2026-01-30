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
    console.log('Checking session...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session);
      if (session?.user) {
        await loadUserData(session.user.id, session.user.email || '');
      } else {
        console.log('No session found');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
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
