import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://quybuvapflnzcaedjbkl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTY4MjAsImV4cCI6MjA1MTM3MjgyMH0.kKMZxPWTqJWZIlkQKQVqQkOjJJfGjNTvNLGJQqNGPjY";

const DEFAULT_OG_IMAGE = "https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img-site.jpg";
const DEFAULT_OG_TITLE = "MenuLove™ - Video Menus for Restaurants";
const DEFAULT_OG_DESCRIPTION = "Transform your restaurant menu with engaging video content. MenuLove™ helps Australian cafés and restaurants showcase dishes through TikTok-style videos.";

interface Restaurant {
  name: string;
  slug: string;
  profile_image_url?: string;
  cuisine?: string;
}

async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?slug=eq.${slug}&select=name,slug,profile_image_url,cuisine`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) return null;
    
    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle /r/:slug routes
  if (!path.startsWith('/r/')) {
    return context.next();
  }

  // Extract slug from path
  const slug = path.replace('/r/', '').split('?')[0]; // Remove query params
  
  // Fetch restaurant data
  const restaurant = await getRestaurantBySlug(slug);
  
  // Get the original index.html from the SPA
  const response = await context.next();
  let html = await response.text();
  
  // Prepare OG tag values
  const ogTitle = restaurant ? restaurant.name : DEFAULT_OG_TITLE;
  const ogDescription = restaurant 
    ? `Explore the menu of ${restaurant.name} through short videos.`
    : DEFAULT_OG_DESCRIPTION;
  const ogImage = restaurant?.profile_image_url || DEFAULT_OG_IMAGE;
  const ogUrl = request.url;
  
  // Replace OG tags in HTML
  html = html
    // Replace og:url
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${ogUrl}" />`
    )
    // Replace og:title
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${ogTitle}" />`
    )
    // Replace og:description
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${ogDescription}" />`
    )
    // Replace og:image
    .replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${ogImage}" />`
    )
    // Replace twitter:title
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/g,
      `<meta name="twitter:title" content="${ogTitle}" />`
    )
    // Replace twitter:description
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/g,
      `<meta name="twitter:description" content="${ogDescription}" />`
    )
    // Replace twitter:image
    .replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${ogImage}" />`
    )
    // Replace page title
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${ogTitle}</title>`
    )
    // Replace meta description
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${ogDescription}" />`
    );
  
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      // Debug headers
      'x-og-function': 'executed',
      'x-og-slug': slug,
      'x-og-restaurant-found': restaurant ? 'yes' : 'no',
      'x-og-title': ogTitle,
      'x-og-image': ogImage,
    },
  });
};
