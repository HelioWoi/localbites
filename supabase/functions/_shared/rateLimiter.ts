/**
 * Rate Limiter for API protection
 * Prevents excessive API calls from social media traffic spikes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

// Rate limit configurations
export const RATE_LIMITS = {
  // Per IP address
  perIP: {
    maxRequests: 50, // 50 requests
    windowMinutes: 60, // per hour
  },
  // Per user (authenticated)
  perUser: {
    maxRequests: 100, // 100 requests
    windowMinutes: 60, // per hour
  },
  // Global (all users combined)
  global: {
    maxRequests: 10000, // 10k requests
    windowMinutes: 60, // per hour (protects against DDoS)
  },
};

/**
 * Check if request should be rate limited
 * Returns true if request should be blocked
 */
export async function isRateLimited(
  supabase: any,
  identifier: string,
  config: RateLimitConfig
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  // Get recent requests from this identifier
  const { data: recentRequests, error } = await supabase
    .from('api_rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .gte('created_at', windowStart.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    // Error other than "not found" - allow request but log error
    console.error('[RateLimit] Error checking rate limit:', error);
    return { limited: false, remaining: config.maxRequests, resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000) };
  }

  const currentCount = recentRequests?.count || 0;
  const remaining = Math.max(0, config.maxRequests - currentCount - 1);
  const resetAt = new Date(now.getTime() + config.windowMinutes * 60 * 1000);

  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    console.warn(`[RateLimit] Limit exceeded for ${identifier}: ${currentCount}/${config.maxRequests}`);
    return { limited: true, remaining: 0, resetAt };
  }

  // Increment counter
  await supabase
    .from('api_rate_limits')
    .upsert({
      identifier,
      count: currentCount + 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }, {
      onConflict: 'identifier',
    });

  return { limited: false, remaining, resetAt };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  // Check common headers for real IP (behind proxies/CDN)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP
  return 'unknown';
}

/**
 * Clean up old rate limit records (run periodically)
 */
export async function cleanupRateLimits(supabase: any) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  const { error } = await supabase
    .from('api_rate_limits')
    .delete()
    .lt('created_at', cutoff.toISOString());

  if (error) {
    console.error('[RateLimit] Cleanup error:', error);
  } else {
    console.log('[RateLimit] Cleanup completed');
  }
}
