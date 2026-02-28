/**
 * Geographic fence for MenuLove
 * Restricts service to Sunshine Coast and Brisbane regions only
 */

export interface Region {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Allowed regions - Sunshine Coast and Brisbane, QLD
export const ALLOWED_REGIONS: Region[] = [
  {
    name: 'sunshine',
    minLat: -27.20,
    maxLat: -25.90,
    minLng: 152.55,
    maxLng: 153.35,
  },
  {
    name: 'brisbane',
    minLat: -27.80,
    maxLat: -27.05,
    minLng: 152.75,
    maxLng: 153.40,
  },
];

/**
 * Check if coordinates are within allowed regions
 * Returns region name if allowed, null if blocked
 */
export function isAllowedRegion(lat: number, lng: number): string | null {
  for (const region of ALLOWED_REGIONS) {
    if (
      lat >= region.minLat &&
      lat <= region.maxLat &&
      lng >= region.minLng &&
      lng <= region.maxLng
    ) {
      return region.name;
    }
  }
  return null;
}

/**
 * Get blocked region response
 */
export function getBlockedRegionResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Region not available yet',
      message: 'MenuLove is currently available only on Sunshine Coast and Brisbane while we stabilise the beta.',
      availableRegions: ['Sunshine Coast, QLD', 'Brisbane, QLD'],
    }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
