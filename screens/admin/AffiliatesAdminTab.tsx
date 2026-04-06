import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, DollarSign, Link2, CheckCircle2, Clock, XCircle,
  RefreshCw, Loader2, ChevronDown, ChevronUp, Copy, Banknote,
  AlertCircle, Search
} from 'lucide-react';

interface Affiliate {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  referral_code: string;
  status: string;
  total_referrals: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
}

interface Commission {
  id: string;
  affiliate_id: string;
  type: string;
  amount: number;
  invoice_amount: number | null;
  commission_rate: number | null;
  payment_number: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  affiliate?: { name: string; email: string };
  referral?: { partner_email: string | null };
}

const AffiliatesAdminTab: React.FC = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAffiliate, setExpandedAffiliate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: affData } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (affData) setAffiliates(affData);

      const { data: commData } = await supabase
        .from('affiliate_commissions')
        .select('*, affiliate:affiliates(name, email), referral:referrals(partner_email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (commData) setCommissions(commData as any);
    } catch (err) {
      console.error('Error loading affiliate data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCommission = async (commissionId: string) => {
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'approved' })
      .eq('id', commissionId);

    if (!error) {
      setCommissions(prev => prev.map(c => c.id === commissionId ? { ...c, status: 'approved' } : c));
    }
  };

  const handleMarkPaid = async (commissionId: string, affiliateId: string) => {
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', commissionId);

    if (!error) {
      setCommissions(prev => prev.map(c => c.id === commissionId ? { ...c, status: 'paid', paid_at: new Date().toISOString() } : c));
      // Update affiliate totals
      await supabase.rpc('update_affiliate_totals', { aff_id: affiliateId });
      loadData();
    }
  };

  const handleRejectCommission = async (commissionId: string) => {
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'rejected' })
      .eq('id', commissionId);

    if (!error) {
      setCommissions(prev => prev.map(c => c.id === commissionId ? { ...c, status: 'rejected' } : c));
    }
  };

  const handleToggleAffiliateStatus = async (affiliateId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('affiliates')
      .update({ status: newStatus })
      .eq('id', affiliateId);

    if (!error) {
      setAffiliates(prev => prev.map(a => a.id === affiliateId ? { ...a, status: newStatus } : a));
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const filteredAffiliates = affiliates.filter(a => {
    const matchesSearch = !searchQuery || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaidAmount = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      inactive: 'bg-zinc-100 text-zinc-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-zinc-100 text-zinc-700'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Affiliate Program</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage affiliates, referrals, and commissions</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">Total Affiliates</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{affiliates.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={16} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold text-zinc-900">{affiliates.reduce((sum, a) => sum + a.total_referrals, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-yellow-500" />
            <span className="text-xs text-zinc-500">Pending Payouts</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendingAmount)}</p>
          <p className="text-[10px] text-zinc-400">{pendingCommissions.length} commission{pendingCommissions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={16} className="text-green-500" />
            <span className="text-xs text-zinc-500">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaidAmount)}</p>
        </div>
      </div>

      {/* Pending Commissions Alert */}
      {pendingCommissions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-yellow-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-900">
                {pendingCommissions.length} Pending Commission{pendingCommissions.length !== 1 ? 's' : ''} ({formatCurrency(totalPendingAmount)})
              </h4>
              <div className="mt-3 space-y-2">
                {pendingCommissions.slice(0, 5).map(comm => (
                  <div key={comm.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-100">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {(comm.affiliate as any)?.name || 'Unknown'} — {formatCurrency(comm.amount)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {comm.type === 'first_payment' ? 'First payment' : `Recurring #${comm.payment_number}`}
                        {' '}&middot;{' '}{formatDate(comm.created_at)}
                        {(comm.referral as any)?.partner_email && ` — ${(comm.referral as any).partner_email}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveCommission(comm.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleMarkPaid(comm.id, comm.affiliate_id)}
                        className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => handleRejectCommission(comm.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affiliates List */}
      <div className="bg-white rounded-xl border border-zinc-200">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900">Affiliates ({filteredAffiliates.length})</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {filteredAffiliates.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No affiliates yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredAffiliates.map(affiliate => {
              const affiliateCommissions = commissions.filter(c => c.affiliate_id === affiliate.id);
              const isExpanded = expandedAffiliate === affiliate.id;

              return (
                <div key={affiliate.id}>
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                    onClick={() => setExpandedAffiliate(isExpanded ? null : affiliate.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-zinc-900 truncate">{affiliate.name}</p>
                        {statusBadge(affiliate.status)}
                      </div>
                      <p className="text-xs text-zinc-500">{affiliate.email}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-zinc-400">
                          Code: <span className="font-mono font-medium text-orange-600">{affiliate.referral_code}</span>
                        </span>
                        <span className="text-xs text-zinc-400">{affiliate.total_referrals} referral{affiliate.total_referrals !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-zinc-400">Earned: {formatCurrency(affiliate.total_earned)}</span>
                        <span className="text-xs text-zinc-400">Paid: {formatCurrency(affiliate.total_paid)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAffiliateStatus(affiliate.id, affiliate.status);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          affiliate.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {affiliate.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-zinc-50">
                      <div className="bg-white rounded-lg border border-zinc-200 p-3">
                        <h4 className="text-sm font-medium text-zinc-700 mb-2">
                          Commissions ({affiliateCommissions.length})
                        </h4>
                        {affiliateCommissions.length === 0 ? (
                          <p className="text-xs text-zinc-400 py-4 text-center">No commissions yet</p>
                        ) : (
                          <div className="space-y-2">
                            {affiliateCommissions.map(comm => (
                              <div key={comm.id} className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-zinc-900">
                                    {comm.type === 'first_payment' ? 'First Payment' : `Recurring #${comm.payment_number}`}
                                    {' '}&mdash;{' '}{formatCurrency(comm.amount)}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {formatDate(comm.created_at)}
                                    {(comm.referral as any)?.partner_email && ` — ${(comm.referral as any).partner_email}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {statusBadge(comm.status)}
                                  {comm.status === 'pending' && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleMarkPaid(comm.id, comm.affiliate_id)}
                                        className="px-2 py-1 text-[10px] font-medium bg-green-500 text-white rounded hover:bg-green-600"
                                      >
                                        Pay
                                      </button>
                                      <button
                                        onClick={() => handleRejectCommission(comm.id)}
                                        className="px-2 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  {comm.status === 'approved' && (
                                    <button
                                      onClick={() => handleMarkPaid(comm.id, comm.affiliate_id)}
                                      className="px-2 py-1 text-[10px] font-medium bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliatesAdminTab;
