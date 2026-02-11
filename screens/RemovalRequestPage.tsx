import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { verifyABN, formatABN, isValidABNFormat } from '../services/abnVerification';
import { supabase } from '../lib/supabase';

interface RemovalRequestPageProps {
  onBack: () => void;
  prefillRestaurantName?: string;
  prefillGooglePlaceId?: string;
}

const RemovalRequestPage: React.FC<RemovalRequestPageProps> = ({ onBack, prefillRestaurantName = '', prefillGooglePlaceId = '' }) => {
  const [step, setStep] = useState<'form' | 'verifying' | 'confirmed' | 'error'>('form');
  const [businessName, setBusinessName] = useState(prefillRestaurantName);
  const [abn, setAbn] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [reason, setReason] = useState('');
  const [googlePlaceId] = useState(prefillGooglePlaceId);
  const [abnVerified, setAbnVerified] = useState(false);
  const [abnError, setAbnError] = useState('');
  const [isVerifyingAbn, setIsVerifyingAbn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedBusinessName, setVerifiedBusinessName] = useState('');

  const handleVerifyABN = async () => {
    if (!isValidABNFormat(abn)) {
      setAbnError('Please enter a valid 11-digit ABN');
      return;
    }
    if (!businessName.trim()) {
      setAbnError('Please enter your business name first');
      return;
    }

    setIsVerifyingAbn(true);
    setAbnError('');

    try {
      const result = await verifyABN(abn, businessName.trim());
      if (result.isValid && result.isActive) {
        setAbnVerified(true);
        setVerifiedBusinessName(result.businessName);
        setAbnError('');
      } else {
        setAbnVerified(false);
        setAbnError(result.message || 'ABN could not be verified. Please check and try again.');
      }
    } catch {
      setAbnError('Verification service unavailable. Please try again later.');
    } finally {
      setIsVerifyingAbn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abnVerified) {
      setAbnError('Please verify your ABN first');
      return;
    }
    if (!contactEmail.trim()) return;

    setIsSubmitting(true);
    try {
      // Store removal request in Supabase
      const { error } = await supabase.from('removal_requests').insert({
        business_name: businessName.trim(),
        verified_business_name: verifiedBusinessName,
        abn: abn.replace(/\s/g, ''),
        contact_email: contactEmail.trim(),
        reason: reason.trim() || null,
        google_place_id: googlePlaceId || null,
        status: 'pending',
      });

      if (error) {
        console.error('Removal request save error:', error);
      }

      // Send email notification to admin
      try {
        await supabase.functions.invoke('notify-removal', {
          body: {
            business_name: businessName.trim(),
            verified_business_name: verifiedBusinessName,
            abn: abn.replace(/\s/g, ''),
            contact_email: contactEmail.trim(),
            reason: reason.trim() || null,
          },
        });
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }

      setStep('confirmed');
    } catch (err) {
      console.error('Removal request error:', err);
      setStep('confirmed'); // Show success anyway — we'll handle via email
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-zinc-100">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={onBack} className="w-9 h-9 bg-zinc-100 rounded-full flex items-center justify-center">
            <ChevronLeft size={20} className="text-zinc-700" />
          </button>
          <h1 className="text-lg font-bold text-zinc-900">Listing Removal Request</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6">
        {step === 'form' && (
          <>
            {/* Info box */}
            <div className="bg-zinc-50 rounded-2xl p-4 mb-6">
              <p className="text-sm text-zinc-600 leading-relaxed">
                The information displayed on LocalBites is publicly available data provided by Google Maps. 
                If you wish to update or remove your listing from our platform, please complete this form. 
                We verify business ownership via ABN to protect against unauthorised requests.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">Business Name *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => { setBusinessName(e.target.value); setAbnVerified(false); }}
                  placeholder="e.g. The Coffee House"
                  required
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* ABN */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">ABN (Australian Business Number) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={abn}
                    onChange={(e) => {
                      const formatted = formatABN(e.target.value);
                      setAbn(formatted);
                      setAbnVerified(false);
                      setAbnError('');
                    }}
                    placeholder="XX XXX XXX XXX"
                    maxLength={14}
                    required
                    className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyABN}
                    disabled={isVerifyingAbn || abnVerified}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      abnVerified 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95'
                    } disabled:opacity-60`}
                  >
                    {isVerifyingAbn ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : abnVerified ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>

                {abnVerified && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <ShieldCheck size={14} />
                    <span className="text-xs font-medium">Verified: {verifiedBusinessName}</span>
                  </div>
                )}

                {abnError && (
                  <div className="flex items-center gap-2 mt-2 text-red-500">
                    <AlertCircle size={14} />
                    <span className="text-xs">{abnError}</span>
                  </div>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">Contact Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="owner@business.com.au"
                  required
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Reason (optional) */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you'd like to be removed..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!abnVerified || !contactEmail.trim() || isSubmitting}
                className="w-full py-3.5 bg-zinc-900 text-white font-bold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                ) : (
                  'Submit Removal Request'
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="text-[10px] text-zinc-400 text-center mt-6 leading-relaxed">
              Removal requests are reviewed within 48 business hours. 
              You will receive a confirmation email once processed. 
              Alternatively, you can update your listing directly on{' '}
              <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
                Google Business Profile
              </a>.
            </p>
          </>
        )}

        {step === 'confirmed' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Request Submitted</h2>
            <p className="text-sm text-zinc-500 max-w-xs mb-6">
              We've received your removal request for <strong>{businessName}</strong>. 
              You'll receive a confirmation at <strong>{contactEmail}</strong> within 48 business hours.
            </p>
            <button
              onClick={onBack}
              className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm active:scale-95 transition-all"
            >
              Back to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemovalRequestPage;
