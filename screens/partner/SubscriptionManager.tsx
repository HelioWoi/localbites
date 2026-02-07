import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, Crown, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SubscriptionManagerProps {
  partnerId: string;
  partnerEmail: string;
}

interface SubscriptionData {
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ partnerId, partnerEmail }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const PRICE_IDS = {
    monthly: 'price_1SxxClIG1T8Ip1Z0i9rOM0gj', // Live Mode - Monthly $29.90
    annual: 'price_1SxxDjIG1T8Ip1Z0cgTPEV7Z',  // Live Mode - Annual $308.90
  };

  useEffect(() => {
    loadSubscription();
    
    // Check if returning from successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      // Reload subscription data after a short delay to ensure webhook has processed
      setTimeout(() => {
        loadSubscription();
      }, 2000);
      
      // Clean up URL
      window.history.replaceState({}, '', '/partner');
    }
  }, [partnerId]);

  const loadSubscription = async () => {
    try {
      console.log('[SubscriptionManager] Loading subscription for partner:', partnerId);
      const { data: partner, error } = await supabase
        .from('partners')
        .select('subscription_status, subscription_plan, subscription_end_date, subscription_start_date, stripe_subscription_id, lifetime_access, trial_ends_at')
        .eq('id', partnerId)
        .single();

      if (error) {
        console.error('[SubscriptionManager] Error loading partner:', error);
      }

      console.log('[SubscriptionManager] Partner data:', partner);

      // Check for lifetime access first
      if (partner?.lifetime_access === true) {
        console.log('[SubscriptionManager] Partner has lifetime access');
        setSubscription({
          status: 'lifetime',
          plan: 'Lifetime',
          currentPeriodEnd: '2099-12-31',
          cancelAtPeriodEnd: false,
        });
      } else if (partner && partner.subscription_status && partner.subscription_status !== 'inactive' && partner.stripe_subscription_id) {
        console.log('[SubscriptionManager] Setting subscription:', {
          status: partner.subscription_status,
          plan: partner.subscription_plan,
          endDate: partner.subscription_end_date
        });
        setSubscription({
          status: partner.subscription_status,
          plan: partner.subscription_plan || 'None',
          currentPeriodEnd: partner.subscription_end_date,
          cancelAtPeriodEnd: false,
        });
      } else {
        console.log('[SubscriptionManager] No active subscription found');
        setSubscription(null);
      }
    } catch (error) {
      console.error('[SubscriptionManager] Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setProcessingCheckout(true);
    try {
      // Verificar se usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session ? 'Authenticated' : 'Not authenticated');
      
      if (!session) {
        alert('You need to be logged in to subscribe. Please log in and try again.');
        return;
      }

      console.log('Creating checkout session for partner:', partnerId, 'with price:', priceId);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          partnerId,
          priceId,
          successUrl: `${window.location.origin}/partner?success=true`,
          cancelUrl: `${window.location.origin}/partner?canceled=true`,
        },
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Checkout error details:', error);
        throw error;
      }

      if (data?.url) {
        console.log('Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Failed to start checkout: ${error.message || 'Please try again.'}`);
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          partnerId,
          returnUrl: `${window.location.origin}/partner`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const isLifetime = subscription?.status === 'lifetime';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing' || isLifetime;
  
  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const endDate = new Date(subscription.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };
  
  const daysRemaining = getDaysRemaining();
  
  // Detect trial: if days remaining is <= 14, it's likely a trial period
  const isTrialing = isActive && !isLifetime && daysRemaining > 0 && daysRemaining <= 14;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Subscription</h2>
        <p className="text-zinc-600">Manage your Local Bites premium subscription</p>
      </div>

      {isLifetime && (
        <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-3xl p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Crown size={40} className="text-yellow-300" />
              <div>
                <h3 className="text-3xl font-bold">🎉 Lifetime Access</h3>
                <p className="text-white/90 text-lg">You have unlimited premium access forever!</p>
              </div>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/70 text-sm mb-1">Plan</p>
                  <p className="font-bold text-xl">Lifetime Premium</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-1">Expires</p>
                  <p className="font-bold text-xl">Never ∞</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-white/80">✅ All premium features unlocked</p>
                <p className="text-sm text-white/80">✅ No recurring payments</p>
                <p className="text-sm text-white/80">✅ Priority support included</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isActive && !isLifetime && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Crown size={32} />
            <div>
              <h3 className="text-2xl font-bold">
                {isTrialing ? 'Premium Trial Active' : 'Premium Active'}
              </h3>
              <p className="text-white/80">
                {isTrialing ? `${daysRemaining} days remaining in your free trial` : "You're all set!"}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Plan</p>
              <p className="font-bold text-lg">{subscription.plan}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">{isTrialing ? 'Trial Ends' : 'Renews'}</p>
              <p className="font-bold text-lg">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>

          <button
            onClick={handleManageSubscription}
            className="w-full mt-6 bg-white text-orange-500 font-bold py-4 rounded-2xl hover:bg-white/90 transition-all"
          >
            Manage Subscription
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Plan */}
            <div className="bg-white border-2 border-zinc-200 rounded-3xl p-8 hover:border-orange-500 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Monthly</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-zinc-900">$29.90</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-xl p-3 mb-4">
                <p className="text-zinc-600 text-sm font-medium text-center">
                  14-day free trial
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-green-500" />
                  <span className="text-zinc-700">Unlimited video uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-green-500" />
                  <span className="text-zinc-700">Premium profile badge</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-green-500" />
                  <span className="text-zinc-700">Featured in search results</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-green-500" />
                  <span className="text-zinc-700">Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-green-500" />
                  <span className="text-zinc-700">Priority support</span>
                </li>
              </ul>

              <p className="text-zinc-500 text-sm text-center mb-8">Cancel anytime</p>

              <button
                onClick={() => handleSubscribe(PRICE_IDS.monthly)}
                disabled={processingCheckout}
                className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingCheckout ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Subscribe Monthly
                  </>
                )}
              </button>
            </div>

            {/* Annual Plan */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white text-orange-500 px-3 py-1 rounded-full text-xs font-bold">
                SAVE 19%
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Annual</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">$290</span>
                  <span className="text-white/80">/year</span>
                </div>
                <p className="text-white/60 text-sm mt-1">$24.17/month</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white" />
                  <span>Unlimited video uploads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white" />
                  <span>Premium profile badge</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white" />
                  <span>Featured in search results</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white" />
                  <span>Analytics dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} className="text-white font-bold" />
                  <span className="font-bold">Save $68.80/year</span>
                </li>
              </ul>

              <p className="text-white/60 text-sm text-center mb-8">Cancel anytime</p>

              <button
                onClick={() => handleSubscribe(PRICE_IDS.annual)}
                disabled={processingCheckout}
                className="w-full bg-white text-orange-500 font-bold py-4 rounded-2xl hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingCheckout ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Subscribe Annually
                  </>
                )}
              </button>
            </div>
          </div>

        <div className="bg-zinc-50 rounded-2xl p-6">
          <h4 className="font-bold text-zinc-900 mb-3">What's included:</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-zinc-600">
            <div>
              <p className="font-semibold text-zinc-900 mb-1">🎥 Video Content</p>
              <p>Upload unlimited videos of your best dishes</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">⭐ Premium Badge</p>
              <p>Stand out with a verified premium badge</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">📊 Analytics</p>
              <p>Track views, saves, and engagement</p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default SubscriptionManager;
