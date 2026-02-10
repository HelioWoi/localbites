// Edge Function to verify Australian Business Number (ABN)
// Uses ABN Lookup API from Australian Business Register
// API Documentation: https://abr.business.gov.au/Tools/WebServices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ABNVerificationRequest {
  abn: string;
  businessName: string;
  type?: 'ABN' | 'ACN';
}

interface ABNVerificationResponse {
  isValid: boolean;
  isActive: boolean;
  businessName: string;
  abn: string;
  entityType: string;
  gst: boolean;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { abn, businessName, type = 'ABN' }: ABNVerificationRequest = await req.json();

    if (!abn || !businessName) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: `${type} and business name are required` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Clean number (remove spaces and special characters)
    const cleanABN = abn.replace(/\s/g, '').replace(/[^0-9]/g, '');

    // Validate format: ABN = 11 digits, ACN = 9 digits
    const expectedLength = type === 'ACN' ? 9 : 11;
    if (cleanABN.length !== expectedLength) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: `${type} must be ${expectedLength} digits` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get ABN Lookup API GUID from environment
    const ABN_GUID = Deno.env.get('ABN_LOOKUP_GUID');
    
    if (!ABN_GUID) {
      console.error('ABN_LOOKUP_GUID not configured');
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'ABN verification service not configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Call ABN Lookup API (different endpoint for ACN)
    const abnLookupUrl = type === 'ACN'
      ? `https://abr.business.gov.au/json/AcnDetails.aspx?acn=${cleanABN}&guid=${ABN_GUID}`
      : `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanABN}&guid=${ABN_GUID}`;
    
    console.log(`Calling ABN Lookup API for ${type}:`, cleanABN);
    
    const abnResponse = await fetch(abnLookupUrl);
    const abnText = await abnResponse.text();
    
    // ABN Lookup API returns JSONP: callback({...})
    // Strip the callback wrapper to get pure JSON
    const jsonMatch = abnText.match(/callback\(([\s\S]*)\)/);
    if (!jsonMatch) {
      console.error('Unexpected ABN API response format:', abnText.substring(0, 200));
      return new Response(
        JSON.stringify({ isValid: false, message: 'Unexpected response from ABN service' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const abnData = JSON.parse(jsonMatch[1]);

    console.log('ABN Lookup Response:', JSON.stringify(abnData, null, 2));

    // Check if ABN exists
    if (abnData.Message) {
      return new Response(
        JSON.stringify({ 
          isValid: false,
          isActive: false,
          message: 'ABN not found or invalid',
          abn: cleanABN,
          businessName: '',
          entityType: '',
          gst: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Extract business details
    const entityName = abnData.EntityName || '';
    const abnStatus = abnData.AbnStatus || '';
    const entityType = abnData.EntityTypeName || '';
    const gstStatus = abnData.Gst || '';

    // Check if ABN is active
    const isActive = abnStatus.toLowerCase() === 'active';

    // Check if business name matches (case-insensitive, partial match)
    const normalizedInputName = businessName.toLowerCase().trim();
    const normalizedEntityName = entityName.toLowerCase().trim();
    
    // Allow partial match (at least 60% similarity)
    const nameMatches = normalizedEntityName.includes(normalizedInputName) || 
                        normalizedInputName.includes(normalizedEntityName) ||
                        calculateSimilarity(normalizedInputName, normalizedEntityName) > 0.6;

    // Determine if verification passed
    const isValid = isActive && nameMatches;

    const response: ABNVerificationResponse = {
      isValid,
      isActive,
      businessName: entityName,
      abn: cleanABN,
      entityType,
      gst: gstStatus === 'true',
      message: !isActive 
        ? 'ABN is not active' 
        : !nameMatches 
          ? `Business name does not match. Registered as: ${entityName}`
          : 'Verification successful'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('ABN verification error:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false,
        message: 'Error verifying ABN. Please try again.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Calculate string similarity (Levenshtein distance)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
