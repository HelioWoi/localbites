import React, { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2, Crown, Star, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { STRIPE_PRICE_IDS } from '../../services/stripeConfig';
import { PLAN_LIMITS, PLAN_PRICES, planFromString, type PlanId } from '../../services/stripeService';

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

const FREE_FEATURES = [
  'QR code video menu',
  'Video upload (basic)',
  'Up to 10 menu items',
  '1 location',
  'Standard support',
];

const BASIC_FEATURES = [
  'Everything in Free',
  'Unlimited menu items',
  'Custom branding',
  'Connect your checkout link',
  'Analytics (basic)',
  '30 AI photo credits / month',
  'Priority support',
];

const PRO_FEATURES = [
  'Everything in Basic',
  'Analytics (advanced)',
  'Up to 3 locations',
  '100 AI photo credits / month',
  'Faster AI processing',
  'White-label options',
];

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ partnerId, partnerEmail }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [aiCreditsUsed, setAiCreditsUsed] = useState(0);
  const [aiAddonRemaining, setAiAddonRemaining] = useState(0);
  const [aiCreditsResetAt, setAiCreditsResetAt] = useState<string | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [wasCanceled, setWasCanceled] = useState(false);

  useEffect(() => {
    loadSubscription();
    
    // Check if returning from successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      // Reload subscription data after a short delay to ensure webhook has processed
      setTimeout(() => {
        loadSubscription();
      }, 2000);
    }
  }, [partnerId]);

  const loadSubscription = async () => {
    try {
      const { data: partner, error } = await supabase
        .from('partners')
        .select('subscription_status, subscription_plan, subscription_end_date, subscription_start_date, stripe_subscription_id, lifetime_access, trial_ends_at, ai_credits_used, ai_credits_addon_remaining, ai_credits_reset_at')
        .eq('id', partnerId)
        .single();

      if (error) console.error('[SubscriptionManager] Error loading partner:', error);

      setAiCreditsUsed(partner?.ai_credits_used ?? 0);
      setAiAddonRemaining(partner?.ai_credits_addon_remaining ?? 0);
      setAiCreditsResetAt(partner?.ai_credits_reset_at ?? null);

      const rawPlan = String(partner?.subscription_plan || '').toLowerCase();
      const hasPaidPlanAssigned = ['basic', 'pro', 'monthly', 'annual'].includes(rawPlan);
      const hasActive = partner?.lifetime_access ||
        partner?.subscription_status === 'active' ||
        partner?.subscription_status === 'trialing' ||
        (hasPaidPlanAssigned && partner?.subscription_status !== 'canceled');

      setCurrentPlan(
        partner?.lifetime_access ? 'pro'
        : planFromString(partner?.subscription_plan, !!hasActive)
      );

      if (partner?.lifetime_access === true) {
        setSubscription({ status: 'lifetime', plan: 'pro', currentPeriodEnd: '2099-12-31', cancelAtPeriodEnd: false });
      } else if (partner && hasActive) {
        setSubscription({
          status: partner.subscription_status || 'active',
          plan: partner.subscription_plan || 'basic',
          currentPeriodEnd: partner.subscription_end_date || partner.ai_credits_reset_at || partner.trial_ends_at || '',
          cancelAtPeriodEnd: false,
        });
      } else {
        setWasCanceled(partner?.subscription_status === 'canceled');
        setSubscription(null);
      }
    } catch (error) {
      console.error('[SubscriptionManager] Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, planKey: string, checkoutType: 'subscription' | 'ai_credits_addon' = 'subscription') => {
    if (!priceId) {
      alert('This plan is not yet available. Please contact support.');
      return;
    }
    setProcessingPlan(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You need to be logged in to subscribe. Please log in and try again.');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          partnerId,
          priceId,
          checkoutType,
          successUrl: `${window.location.origin}/partner?success=true`,
          cancelUrl: `${window.location.origin}/partner?canceled=true`,
        },
      });
      if (error) throw new Error(typeof error === 'object' ? JSON.stringify(error) : error);
      if (data?.error) throw new Error(data.stripe || data.error || 'Checkout failed');
      if (data?.url) window.location.href = data.url;
      else throw new Error('No checkout URL returned.');
    } catch (err: any) {
      alert(`Failed to start checkout: ${err.message || 'Please try again.'}`);
    } finally {
      setProcessingPlan(null);
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

  const getDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const diff = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };
  const daysRemaining = getDaysRemaining();
  const isTrialing = isActive && !isLifetime && daysRemaining <= 14;

  const basicPriceId  = billing === 'monthly' ? STRIPE_PRICE_IDS.basic_monthly  : STRIPE_PRICE_IDS.basic_annual;
  const proPriceId    = billing === 'monthly' ? STRIPE_PRICE_IDS.pro_monthly    : STRIPE_PRICE_IDS.pro_annual;
  const basicMonthly  = billing === 'monthly' ? PLAN_PRICES.basic.monthly : +(PLAN_PRICES.basic.annual / 12).toFixed(2);
  const proMonthly    = billing === 'monthly' ? PLAN_PRICES.pro.monthly   : +(PLAN_PRICES.pro.annual   / 12).toFixed(2);
  const aiLimit       = PLAN_LIMITS[currentPlan].aiCredits;
  const aiCreditsTotalAvailable = Math.max(0, aiLimit - aiCreditsUsed) + aiAddonRemaining;
  const canBuyAddon = aiLimit > 0 && !isLifetime;
  const aiBaseUsedPct = aiLimit > 0 ? Math.min(100, Math.round((aiCreditsUsed / aiLimit) * 100)) : 0;
  const daysToReset = aiCreditsResetAt
    ? Math.max(0, Math.ceil((new Date(aiCreditsResetAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-1">Subscription</h2>
        <p className="text-zinc-500 text-sm">Manage your MenuLove plan</p>
      </div>

      {/* Lifetime badge */}
      {isLifetime && (
        <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl p-6 text-white mb-6 flex items-center gap-4">
          <Crown size={36} className="text-yellow-300 shrink-0" />
          <div>
            <p className="text-xl font-bold">Lifetime Access — Pro tier</p>
            <p className="text-white/80 text-sm">All features unlocked forever. No recurring payments.</p>
          </div>
        </div>
      )}

      {canBuyAddon && (
        <div className="rounded-2xl border border-violet-200 bg-white p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-500" />
            <p className="font-bold text-zinc-900">AI Photo Credits</p>
          </div>

          {/* Base credits progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
              <span>Base credits used this cycle</span>
              <span className="font-semibold text-zinc-700">{aiCreditsUsed} / {aiLimit}</span>
            </div>
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  aiBaseUsedPct >= 90 ? 'bg-red-500' :
                  aiBaseUsedPct >= 70 ? 'bg-orange-400' :
                  'bg-violet-500'
                }`}
                style={{ width: `${aiBaseUsedPct}%` }}
              />
            </div>
          </div>

          {/* Add-on & summary row */}
          <div className="flex flex-wrap gap-3 text-sm mb-4">
            <span className="px-2.5 py-1 bg-zinc-100 rounded-lg text-zinc-600">
              <span className="font-semibold text-zinc-800">{Math.max(0, aiLimit - aiCreditsUsed)}</span> base left
            </span>
            {aiAddonRemaining > 0 && (
              <span className="px-2.5 py-1 bg-violet-100 rounded-lg text-violet-700">
                <span className="font-semibold">+{aiAddonRemaining}</span> add-on
              </span>
            )}
            <span className="px-2.5 py-1 bg-green-50 rounded-lg text-green-700">
              <span className="font-semibold">{aiCreditsTotalAvailable}</span> total left
            </span>
            {daysToReset !== null && (
              <span className="px-2.5 py-1 bg-zinc-50 rounded-lg text-zinc-500">
                Resets in <span className="font-semibold text-zinc-700">{daysToReset}d</span>
              </span>
            )}
          </div>

          {/* Upsell */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-zinc-100">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Need more this cycle?</p>
              <p className="text-xs text-zinc-500 mt-0.5">One-off pack of +50 credits · expires at your next billing reset</p>
            </div>
            <button
              onClick={() => handleSubscribe(STRIPE_PRICE_IDS.ai_credits_50, 'addon50', 'ai_credits_addon')}
              disabled={!!processingPlan || !STRIPE_PRICE_IDS.ai_credits_50}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {processingPlan === 'addon50'
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <><Sparkles size={14} /> Buy +50 credits — A$19</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Active subscription status bar */}
      {isActive && !isLifetime && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-zinc-900 capitalize">
              {currentPlan} Plan — {isTrialing ? `Trial (${daysRemaining}d left)` : 'Active'}
            </p>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-zinc-500 mt-0.5">
                {isTrialing ? 'Trial ends' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU')}
              </p>
            )}
          </div>
          <button
            onClick={handleManageSubscription}
            className="shrink-0 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors text-sm"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Canceled notice */}
      {!isActive && wasCanceled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold text-sm">Your subscription was canceled. Choose a plan below to reactivate.</p>
        </div>
      )}

      {/* Billing toggle */}
      {!isLifetime && (
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex bg-zinc-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              Annual
              <span className="bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded-full">-10%</span>
            </button>
          </div>
        </div>
      )}

      {/* Plan cards */}
      {!isLifetime && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* FREE */}
          <div className={`rounded-2xl border-2 p-6 flex flex-col ${currentPlan === 'free' ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">$0</span>
                <span className="text-zinc-400 text-sm">/month</span>
              </div>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                  <Check size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {currentPlan === 'free' ? (
              <div className="w-full py-2.5 rounded-xl bg-zinc-200 text-zinc-500 font-semibold text-sm text-center">Current Plan</div>
            ) : (
              <div className="w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-400 font-semibold text-sm text-center">Free tier</div>
            )}
          </div>

          {/* BASIC */}
          <div className={`rounded-2xl border-2 p-6 flex flex-col relative ${currentPlan === 'basic' ? 'border-orange-500 bg-orange-50' : 'border-orange-400 bg-white'}`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-2">Basic</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">${basicMonthly}</span>
                <span className="text-zinc-400 text-sm">/month</span>
              </div>
              {billing === 'annual' && (
                <p className="text-xs text-green-600 font-medium mt-1">A${PLAN_PRICES.basic.annual}/year · save $35</p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {BASIC_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                  <Check size={15} className="text-orange-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {currentPlan === 'basic' ? (
              <div className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm text-center">Current Plan</div>
            ) : currentPlan === 'pro' ? (
              <div className="w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-400 font-semibold text-sm text-center">Downgrade via portal</div>
            ) : (
              <button
                onClick={() => handleSubscribe(basicPriceId, 'basic')}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingPlan === 'basic' ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {processingPlan === 'basic' ? 'Processing…' : 'Start Basic'}
              </button>
            )}
          </div>

          {/* PRO */}
          <div className={`rounded-2xl border-2 p-6 flex flex-col ${currentPlan === 'pro' && !isLifetime ? 'border-violet-500 bg-violet-50' : 'border-zinc-200 bg-white'}`}>
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-2">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">${proMonthly}</span>
                <span className="text-zinc-400 text-sm">/month</span>
              </div>
              {billing === 'annual' && (
                <p className="text-xs text-green-600 font-medium mt-1">A${PLAN_PRICES.pro.annual}/year · save $83</p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                  <Check size={15} className="text-violet-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {currentPlan === 'pro' ? (
              <div className="w-full py-2.5 rounded-xl bg-violet-500 text-white font-bold text-sm text-center">Current Plan</div>
            ) : (
              <button
                onClick={() => handleSubscribe(proPriceId, 'pro')}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingPlan === 'pro' ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                {processingPlan === 'pro' ? 'Processing…' : currentPlan === 'basic' ? 'Upgrade to Pro' : 'Start Pro'}
              </button>
            )}
          </div>

        </div>
      )}

      <p className="text-center text-xs text-zinc-400">14-day free trial on paid plans · No credit card required · Cancel anytime</p>
    </div>
  );
};

export default SubscriptionManager;
