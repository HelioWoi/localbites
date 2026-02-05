import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SuperAdminDashboardNew from './SuperAdminDashboardNew';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

const SuperAdminPortal: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
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

      console.log('📧 User email:', currentUser.email);

      // Check if user is a super admin
      const { data: superAdmin, error: adminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('email', currentUser.email)
        .single();

      console.log('👑 Super admin data:', superAdmin);
      console.log('❌ Admin error:', adminError);

      if (adminError || !superAdmin) {
        console.log('⚠️ User is not a super admin');
        setError(`Unauthorized access. You do not have admin privileges. (Email: ${currentUser.email})`);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleSignIn = async () => {
    // Redirect to Supabase Auth login
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin`,
      },
    });
    
    if (error) {
      console.error('Sign in error:', error);
      // Fallback to partner login if OAuth fails
      window.location.href = '/partner';
    }
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Access Denied</h1>
          <p className="text-zinc-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignIn}
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <SuperAdminDashboardNew user={user} onLogout={handleLogout} />;
};

export default SuperAdminPortal;
