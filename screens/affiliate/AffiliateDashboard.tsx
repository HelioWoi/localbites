import React, { useState, useEffect } from 'react';
import { 
  Link2, Copy, CheckCircle2, DollarSign, Users,
  LogOut, Clock, Loader2, RefreshCw, Banknote,
  User, Phone, Mail, Building, Save, Trash2, ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AffiliateDashboardProps {
  affiliateId: string;
  onLogout: () => void;
}

interface AffiliateData {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  referral_code: string;
  status: string;
  total_referrals: number;
  total_earned: number;
  total_paid: number;
  payment_method: string | null;
  payment_details: any;
  created_at: string;
}

interface Referral {
  id: string;
  partner_email: string | null;
  status: string;
  referred_at: string;
  signed_up_at: string | null;
  first_payment_at: string | null;
  partner: { restaurant_name: string | null; email: string } | null;
}

interface Commission {
  id: string;
  type: string;
  amount: number;
  invoice_amount: number | null;
  commission_rate: number | null;
  payment_number: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string;
}

type Tab = 'overview' | 'referrals' | 'commissions' | 'payouts' | 'account' | 'rules';

const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ affiliateId, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Account edit state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBankBSB, setEditBankBSB] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editABN, setEditABN] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('bank_transfer');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, [affiliateId]);

  useEffect(() => {
    if (affiliate) {
      setEditName(affiliate.name || '');
      setEditPhone(affiliate.phone || '');
      setEditPaymentMethod(affiliate.payment_method || 'bank_transfer');
      if (affiliate.payment_details) {
        setEditBankBSB(affiliate.payment_details.bsb || '');
        setEditBankAccount(affiliate.payment_details.account_number || '');
        setEditBankName(affiliate.payment_details.account_name || '');
        setEditABN(affiliate.payment_details.abn || '');
      }
    }
  }, [affiliate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: affData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (affData) setAffiliate(affData);

      const { data: refData } = await supabase
        .from('referrals')
        .select('*, partner:partners(restaurant_name, email)')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (refData) setReferrals(refData);

      const { data: commData } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (commData) setCommissions(commData);

      const { data: payData } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('paid_at', { ascending: false });

      if (payData) setPayouts(payData);
    } catch (err) {
      console.error('Error loading affiliate data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}/partner?step=2&ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          payment_method: editPaymentMethod,
          payment_details: {
            bsb: editBankBSB.trim(),
            account_number: editBankAccount.trim(),
            account_name: editBankName.trim(),
            abn: editABN.trim() || null,
          },
        })
        .eq('id', affiliateId);

      if (error) throw error;
      setSaveSuccess('Account details saved successfully!');
      loadData();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await supabase
        .from('affiliates')
        .update({ status: 'inactive' })
        .eq('id', affiliateId);

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error deactivating account:', err);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
      window.location.href = '/affiliate';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/affiliate';
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const pendingEarnings = commissions
    .filter(c => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      tracked: 'bg-zinc-100 text-zinc-700',
      trial: 'bg-indigo-100 text-indigo-700',
      qualified: 'bg-emerald-100 text-emerald-700',
      paid_out: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      signed_up: 'bg-blue-100 text-blue-700',
      subscribed: 'bg-green-100 text-green-700',
      churned: 'bg-red-100 text-red-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] || 'bg-zinc-100 text-zinc-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500">Affiliate data not found.</p>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm";

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'commissions', label: 'Commissions' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'account', label: 'Account' },
    { id: 'rules', label: 'Rules' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h1 className="text-zinc-900 font-semibold text-sm">MenuLove Affiliates</h1>
              <p className="text-zinc-500 text-xs">{affiliate.name} &middot; {affiliate.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Referral Link Card */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={18} className="text-orange-500" />
            <h2 className="text-zinc-900 font-medium text-sm">Your Referral Link</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm text-zinc-700 font-mono overflow-hidden border border-orange-200">
              <span className="truncate block">
                {window.location.origin}/partner?step=2&ref={affiliate.referral_code}
              </span>
            </div>
            <button
              onClick={copyReferralLink}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {copied ? <><CheckCircle2 size={16} /><span>Copied!</span></> : <><Copy size={16} /><span>Copy</span></>}
            </button>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            Code: <span className="text-orange-600 font-mono font-medium">{affiliate.referral_code}</span> 
            &nbsp;&middot;&nbsp; Share this link with restaurants to start earning
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-zinc-400" />
              <span className="text-zinc-500 text-xs">Referrals</span>
            </div>
            <p className="text-zinc-900 text-xl font-bold">{affiliate.total_referrals}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-zinc-400" />
              <span className="text-zinc-500 text-xs">Total Earned</span>
            </div>
            <p className="text-zinc-900 text-xl font-bold">{formatCurrency(affiliate.total_earned)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-yellow-500" />
              <span className="text-zinc-500 text-xs">Pending</span>
            </div>
            <p className="text-yellow-600 text-xl font-bold">{formatCurrency(pendingEarnings)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={14} className="text-green-500" />
              <span className="text-zinc-500 text-xs">Paid Out</span>
            </div>
            <p className="text-green-600 text-xl font-bold">{formatCurrency(affiliate.total_paid)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="text-zinc-900 font-bold text-sm mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { n: '1', title: 'Share your link', desc: 'Share your unique referral link with restaurants and cafes' },
                  { n: '2', title: 'They sign up & start trial', desc: 'A referral is tracked when the restaurant registers through your link' },
                  { n: '3', title: 'Commission after first paid invoice', desc: 'You earn after trial converts to paid: $39 first payment + 25% monthly for 6 months' },
                ].map(step => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-orange-600 text-xs font-bold">{step.n}</span>
                    </div>
                    <div>
                      <p className="text-zinc-900 text-sm font-medium">{step.title}</p>
                      <p className="text-zinc-500 text-xs">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-zinc-900 font-bold text-sm">Recent Activity</h3>
                <button onClick={loadData} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
              {commissions.length === 0 && referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">No activity yet</p>
                  <p className="text-zinc-400 text-xs mt-1">Share your referral link to start earning</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...commissions.slice(0, 3).map(c => ({
                    type: 'commission' as const,
                    date: c.created_at,
                    text: c.type === 'first_payment' ? 'First payment commission' : `Recurring commission (#${c.payment_number})`,
                    amount: c.amount,
                    status: c.status,
                  })), ...referrals.slice(0, 3).map(r => ({
                    type: 'referral' as const,
                    date: r.referred_at,
                    text: `New referral: ${r.partner_email || r.partner?.email || 'Unknown'}`,
                    amount: null,
                    status: r.status,
                  }))]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.type === 'commission' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            {item.type === 'commission' ? <DollarSign size={14} className="text-green-600" /> : <Users size={14} className="text-blue-600" />}
                          </div>
                          <div>
                            <p className="text-zinc-900 text-xs font-medium">{item.text}</p>
                            <p className="text-zinc-400 text-[10px]">{formatDate(item.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.amount !== null && (
                            <p className="text-green-600 text-sm font-medium">+{formatCurrency(item.amount)}</p>
                          )}
                          {statusBadge(item.status)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="bg-white rounded-xl border border-zinc-200">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="text-zinc-900 font-bold text-sm">All Referrals ({referrals.length})</h3>
            </div>
            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <Users size={32} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No referrals yet</p>
                <p className="text-zinc-400 text-xs mt-1">Share your link to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {referrals.map(ref => (
                  <div key={ref.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-900 text-sm font-medium">
                        {ref.partner?.restaurant_name || ref.partner_email || 'Pending'}
                      </p>
                      <p className="text-zinc-500 text-xs">{ref.partner_email || ref.partner?.email}</p>
                      <p className="text-zinc-400 text-[10px] mt-1">Referred {formatDate(ref.referred_at)}</p>
                    </div>
                    {statusBadge(ref.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="bg-white rounded-xl border border-zinc-200">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="text-zinc-900 font-bold text-sm">Commission History ({commissions.length})</h3>
            </div>
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign size={32} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No commissions yet</p>
                <p className="text-zinc-400 text-xs mt-1">Commissions appear when your referrals make payments</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {commissions.map(comm => (
                  <div key={comm.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-900 text-sm font-medium">
                        {comm.type === 'first_payment' ? 'First Payment' : `Recurring #${comm.payment_number}`}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {comm.type === 'first_payment' 
                          ? 'Fixed $39 commission' 
                          : `${comm.commission_rate}% of ${comm.invoice_amount ? formatCurrency(comm.invoice_amount) : 'N/A'}`
                        }
                      </p>
                      <p className="text-zinc-400 text-[10px] mt-1">{formatDate(comm.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-medium text-sm">+{formatCurrency(comm.amount)}</p>
                      {statusBadge(comm.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="bg-white rounded-xl border border-zinc-200">
            <div className="p-4 border-b border-zinc-100">
              <h3 className="text-zinc-900 font-bold text-sm">Payout History ({payouts.length})</h3>
            </div>
            {payouts.length === 0 ? (
              <div className="text-center py-12">
                <Banknote size={32} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No payouts yet</p>
                <p className="text-zinc-400 text-xs mt-1">Payouts are processed when your commissions are approved</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {payouts.map(payout => (
                  <div key={payout.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-900 text-sm font-medium">{formatCurrency(payout.amount)}</p>
                      <p className="text-zinc-500 text-xs">{payout.method || 'Transfer'}</p>
                      {payout.reference && (
                        <p className="text-zinc-400 text-[10px] mt-0.5">Ref: {payout.reference}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 text-sm font-medium">{formatDate(payout.paid_at)}</p>
                      {statusBadge('paid')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Account Settings</h2>
              <p className="text-sm text-zinc-500 mt-1">Manage your personal information and payment details</p>
            </div>

            {saveSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <p className="text-sm text-green-700">{saveSuccess}</p>
              </div>
            )}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            )}

            {/* Personal Info */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <User size={18} className="text-zinc-400" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Full Name *</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Email</label>
                  <input type="email" value={affiliate.email} disabled className={`${inputClass} bg-zinc-50 text-zinc-400 cursor-not-allowed`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Phone</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className={inputClass} placeholder="04XX XXX XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Referral Code</label>
                  <input type="text" value={affiliate.referral_code} disabled className={`${inputClass} bg-zinc-50 text-zinc-400 cursor-not-allowed font-mono`} />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h3 className="text-lg font-bold text-zinc-900 mb-1 flex items-center gap-2">
                <Building size={18} className="text-zinc-400" />
                Payment Details
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Add your bank details so we can pay your commissions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Account Name *</label>
                  <input type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} className={inputClass} placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">BSB *</label>
                  <input type="text" value={editBankBSB} onChange={e => setEditBankBSB(e.target.value)} className={inputClass} placeholder="XXX-XXX" maxLength={7} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Account Number *</label>
                  <input type="text" value={editBankAccount} onChange={e => setEditBankAccount(e.target.value)} className={inputClass} placeholder="XXXX XXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">ABN <span className="text-zinc-400 font-normal">(optional)</span></label>
                  <input type="text" value={editABN} onChange={e => setEditABN(e.target.value)} className={inputClass} placeholder="XX XXX XXX XXX" maxLength={14} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Payment Method</label>
                  <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)} className={inputClass}>
                    <option value="bank_transfer">Bank Transfer (AUD)</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveAccount}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
                <Trash2 size={18} className="text-red-500" />
                Danger Zone
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Deactivating your account will stop all referral tracking and commission payments.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Deactivate Account
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-red-600 font-medium">Are you sure?</p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Yes, Deactivate
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Affiliate Program Rules & Policies</h2>
              <p className="text-sm text-zinc-500 mt-1">Please read and follow these guidelines</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">1. Commission Structure</h3>
                <ul className="text-sm text-zinc-600 space-y-1 list-disc list-inside">
                  <li>Commission is only generated after the referred restaurant completes their first paid subscription (after trial).</li>
                  <li><strong>$39 AUD</strong> on the first successful paid invoice.</li>
                  <li><strong>25%</strong> recurring commission on each monthly payment for <strong>6 months</strong></li>
                  <li>Maximum of 7 commissions per referral (1 first + 6 recurring)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">2. Referral Tracking</h3>
                <ul className="text-sm text-zinc-600 space-y-1 list-disc list-inside">
                  <li>Referrals are tracked via your unique referral link for up to <strong>30 days</strong></li>
                  <li>The restaurant must sign up and subscribe using your referral link</li>
                  <li>Self-referrals are not allowed</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">3. Payment Terms</h3>
                <ul className="text-sm text-zinc-600 space-y-1 list-disc list-inside">
                  <li>Commissions are reviewed and approved monthly</li>
                  <li>Payments are made via bank transfer to your registered account</li>
                  <li>Minimum payout threshold: <strong>$20 AUD</strong></li>
                  <li>Ensure your bank details are up to date in the Account tab</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">4. Prohibited Activities</h3>
                <ul className="text-sm text-zinc-600 space-y-1 list-disc list-inside">
                  <li>Spam or unsolicited messages to promote your referral link</li>
                  <li>Misleading claims about MenuLove or its services</li>
                  <li>Creating fake accounts or referrals</li>
                  <li>Using paid ads that bid on "MenuLove" branded keywords</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 mb-2">5. Account Termination</h3>
                <ul className="text-sm text-zinc-600 space-y-1 list-disc list-inside">
                  <li>MenuLove reserves the right to suspend or terminate affiliate accounts for policy violations</li>
                  <li>Pending commissions may be forfeited if the account is terminated for misconduct</li>
                  <li>You may deactivate your account at any time from the Account tab</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <ShieldAlert size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Questions?</h4>
                  <p className="text-xs text-blue-700">
                    If you have any questions about the affiliate program, contact us at{' '}
                    <a href="mailto:support@menulove.com.au" className="underline font-medium">support@menulove.com.au</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateDashboard;
