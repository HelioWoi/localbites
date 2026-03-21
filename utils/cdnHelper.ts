/**
 * CDN Helper - Bunny.net Integration
 * 
 * Converts Supabase Storage URLs to Bunny CDN URLs for faster video delivery.
 * 
 * How it works:
 * - Upload still goes to Supabase (partner dashboard)
 * - Playback uses Bunny CDN (Pull Zone)
 * - Bunny fetches from Supabase on first request, then caches
 */

const SUPABASE_STORAGE_URL = 'https://quybuvapflnzcaedjbkl.supabase.co';
const BUNNY_CDN_URL = 'https://menulove.b-cdn.net';

/**
 * Convert Supabase URL to Bunny CDN URL for video playback
 * Only converts video URLs, leaves images unchanged for now
 */
export const getCDNUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // TEMPORARILY BYPASSED: Bunny CDN has cache-control: no-cache from Supabase origin,
  // causing MISS on every request (slower than Supabase direct).
  // TODO: Re-enable after configuring Bunny to override origin cache headers.
  return url;
};

/**
 * Get original Supabase URL (for uploads, admin panel, etc)
 */
export const getOriginalUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  if (url.startsWith(BUNNY_CDN_URL)) {
    return url.replace(BUNNY_CDN_URL, SUPABASE_STORAGE_URL);
  }
  
  return url;
};
