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
    monthly: 'price_1SvzbsIG1T8Ip1Z0zLOzEVBR',
    annual: 'price_1SvzdrIG1T8Ip1Z0EQGKZjer',
  };

  useEffect(() => {
    loadSubscription();
  }, [partnerId]);

  const loadSubscription = async () => {
    try {
      const { data: partner } = await supabase
        .from('partners')
        .select('subscription_status, subscription_plan, subscription_end_date, stripe_subscription_id')
        .eq('id', partnerId)
        .single();

      if (partner && partner.subscription_status && partner.subscription_status !== 'inactive' && partner.stripe_subscription_id) {
        setSubscription({
          status: partner.subscription_status,
          plan: partner.subscription_plan || 'None',
          currentPeriodEnd: partner.subscription_end_date,
          cancelAtPeriodEnd: false,
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
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

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Subscription</h2>
        <p className="text-zinc-600">Manage your LocalBites premium subscription</p>
      </div>

      {isActive && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Crown size={32} />
            <div>
              <h3 className="text-2xl font-bold">Premium Active</h3>
              <p className="text-white/80">You're all set!</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Plan</p>
              <p className="font-bold text-lg">{subscription.plan}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Renews</p>
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
                SAVE 14%
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">Annual</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">$308.90</span>
                  <span className="text-white/80">/year</span>
                </div>
                <p className="text-white/60 text-sm mt-1">$25.74/month</p>
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
                  <span className="font-bold">Save $49.90/year</span>
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
