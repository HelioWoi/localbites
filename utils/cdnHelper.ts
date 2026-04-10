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

  if (url.startsWith(BUNNY_CDN_URL)) {
    return url;
  }

  const lower = url.toLowerCase();
  const urlWithoutQuery = lower.split('?')[0].split('#')[0];
  const isVideoAsset =
    lower.includes('/menu-videos/') ||
    urlWithoutQuery.endsWith('.mp4') ||
    urlWithoutQuery.endsWith('.mov') ||
    urlWithoutQuery.endsWith('.webm') ||
    urlWithoutQuery.endsWith('.m3u8');

  if (!isVideoAsset) {
    return url;
  }

  if (url.startsWith(SUPABASE_STORAGE_URL)) {
    return url.replace(SUPABASE_STORAGE_URL, BUNNY_CDN_URL);
  }

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
