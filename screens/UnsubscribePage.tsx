import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UnsubscribePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('id');

    if (!partnerId) {
      setError('Invalid unsubscribe link');
      setLoading(false);
      return;
    }

    handleUnsubscribe(partnerId);
  }, []);

  const handleUnsubscribe = async (partnerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('unsubscribe-partner', {
        body: { partnerId, action: 'unsubscribe' },
      });

      if (error) throw error;

      setPartnerEmail(data.partner.email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      setError(err.message || 'Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('id');

    if (!partnerId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('unsubscribe-partner', {
        body: { partnerId, action: 'subscribe' },
      });

      if (error) throw error;

      setSuccess(false);
      alert('Successfully resubscribed to marketing emails!');
    } catch (err: any) {
      console.error('Resubscribe error:', err);
      alert('Failed to resubscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Processing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <span style={{ fontSize: '32px' }}>❌</span>
          </div>
          <h1 style={{
            margin: '0 0 12px',
            fontSize: '24px',
            fontWeight: '700',
            color: '#18181b',
          }}>
            Error
          </h1>
          <p style={{
            margin: '0',
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <span style={{ fontSize: '32px' }}>✅</span>
        </div>
        
        <h1 style={{
          margin: '0 0 12px',
          fontSize: '24px',
          fontWeight: '700',
          color: '#18181b',
        }}>
          Successfully Unsubscribed
        </h1>
        
        <p style={{
          margin: '0 0 8px',
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: '1.6',
        }}>
          {partnerEmail && (
            <>
              <strong>{partnerEmail}</strong> has been unsubscribed from marketing emails.
            </>
          )}
        </p>

        <p style={{
          margin: '0 0 30px',
          fontSize: '14px',
          color: '#9ca3af',
          lineHeight: '1.6',
        }}>
          You will no longer receive activation reminders or marketing emails from MenuLove.
          You will still receive important account-related emails.
        </p>

        <button
          onClick={handleResubscribe}
          style={{
            backgroundColor: '#f97316',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(249, 115, 22, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#ea580c';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f97316';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Changed your mind? Resubscribe
        </button>

        <p style={{
          margin: '30px 0 0',
          fontSize: '12px',
          color: '#9ca3af',
        }}>
          Questions? Contact us at{' '}
          <a href="mailto:contact@menulove.com.au" style={{ color: '#f97316', textDecoration: 'none' }}>
            contact@menulove.com.au
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UnsubscribePage;
