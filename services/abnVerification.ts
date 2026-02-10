/**
 * ABN Verification Service
 * Verifies Australian Business Numbers using Supabase Edge Function
 */

import { supabase } from '../lib/supabase';

export interface ABNVerificationResult {
  isValid: boolean;
  isActive: boolean;
  businessName: string;
  abn: string;
  entityType: string;
  gst: boolean;
  message?: string;
}

/**
 * Verify an Australian Business Number (ABN)
 * @param abn - The ABN to verify (can include spaces)
 * @param businessName - The business name to match against
 * @returns Verification result
 */
export const verifyABN = async (
  abn: string,
  businessName: string,
  type: 'ABN' | 'ACN' = 'ABN'
): Promise<ABNVerificationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-abn', {
      body: { abn, businessName, type },
    });

    if (error) {
      console.error('ABN verification error:', error);
      return {
        isValid: false,
        isActive: false,
        businessName: '',
        abn: '',
        entityType: '',
        gst: false,
        message: 'Error verifying ABN. Please try again.',
      };
    }

    return data as ABNVerificationResult;
  } catch (error) {
    console.error('ABN verification error:', error);
    return {
      isValid: false,
      isActive: false,
      businessName: '',
      abn: '',
      entityType: '',
      gst: false,
      message: 'Error verifying ABN. Please try again.',
    };
  }
};

/**
 * Format ABN with spaces (XX XXX XXX XXX)
 */
export const formatABN = (abn: string): string => {
  const clean = abn.replace(/\s/g, '').replace(/[^0-9]/g, '');
  if (clean.length !== 11) return abn;
  return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 11)}`;
};

/**
 * Validate ABN format (11 digits)
 */
export const isValidABNFormat = (abn: string): boolean => {
  const clean = abn.replace(/\s/g, '').replace(/[^0-9]/g, '');
  return clean.length === 11;
};
