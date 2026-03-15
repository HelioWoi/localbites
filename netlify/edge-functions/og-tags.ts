import type { Context } from "https://edge.netlify.com";

const SUPABASE_URL = "https://quybuvapflnzcaedjbkl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1eWJ1dmFwZmxuemNhZWRqYmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3OTY4MjAsImV4cCI6MjA1MTM3MjgyMH0.kKMZxPWTqJWZIlkQKQVqQkOjJJfGjNTvNLGJQqNGPjY";

const DEFAULT_OG_IMAGE = "https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img-site.jpg";

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

function generateHTML(restaurant: Restaurant | null, url: string): string {
  const isRestaurantPage = restaurant !== null;
  
  const ogTitle = isRestaurantPage 
    ? restaurant.name 
    : "MenuLove™ - Video Menus for Restaurants";
  
  const ogDescription = isRestaurantPage
    ? `Explore the menu of ${restaurant.name} through short videos.`
    : "Transform your restaurant menu with engaging video content. MenuLove™ helps Australian cafés and restaurants showcase dishes through TikTok-style videos.";
  
  const ogImage = isRestaurantPage && restaurant.profile_image_url
    ? restaurant.profile_image_url
    : DEFAULT_OG_IMAGE;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="MenuLove™">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#000000">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" href="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png">
    <link rel="apple-touch-icon" href="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png">
    <title>${ogTitle}</title>
    
    <!-- Open Graph / Social Share -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDescription}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="MenuLove™" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDescription}" />
    <meta name="twitter:image" content="${ogImage}" />
    
    <meta name="description" content="${ogDescription}" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.cdnfonts.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.cdnfonts.com/css/gilroy" rel="stylesheet">
    <link rel="shortcut icon" href="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/favcon.png" type="image/x-icon">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
     integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
     crossorigin=""/>
    
    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
     integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
     crossorigin=""></script>
    
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
        .profile-scroll {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
        }
        .partner-portal {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            height: 100vh;
        }
        .partner-portal body {
            overflow: auto !important;
        }
        ::-webkit-scrollbar {
            display: none;
        }
        .snap-container {
            scroll-snap-type: y mandatory;
            overflow-y: scroll;
            height: 100vh;
            height: 100dvh;
            width: 100vw;
            background-color: #000000;
        }
        .snap-item {
            scroll-snap-align: start;
            height: 100vh;
            height: 100dvh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        }
        .video-card {
            height: 100%;
            width: 100%;
            border-radius: 0;
            overflow: hidden;
            position: relative;
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-scale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
            50% { box-shadow: 0 0 20px 10px rgba(249, 115, 22, 0.1); }
        }
        @keyframes swipe-hint {
            0%, 100% { transform: translateY(0); opacity: 0.6; }
            50% { transform: translateY(-12px); opacity: 1; }
        }
        @keyframes ken-burns {
            0% { transform: scale(1); }
            100% { transform: scale(1.08); }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-fade-in-scale {
            animation: fade-in-scale 0.5s ease-out forwards;
        }
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
        }
        .animate-swipe-hint {
            animation: swipe-hint 1.5s ease-in-out infinite;
        }
        .animate-ken-burns {
            animation: ken-burns 20s ease-out forwards;
        }
        .animate-shimmer {
            background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
        .animation-delay-500 { animation-delay: 500ms; }
        
        .leaflet-container {
            height: 100%;
            width: 100%;
            z-index: 1;
        }
        .custom-marker {
            background: transparent !important;
            border: none !important;
        }
        .user-location-marker {
            background: transparent !important;
            border: none !important;
        }
        .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 8px;
        }
        .leaflet-popup-content {
            margin: 8px;
        }
        #desktop-splash {
            display: none !important;
        }
    </style>
<script type="importmap">
{
  "imports": {
    "@google/genai": "https://esm.sh/@google/genai@^1.38.0",
    "lucide-react": "https://esm.sh/lucide-react@^0.563.0",
    "react-dom/": "https://esm.sh/react-dom@^19.2.4/",
    "react/": "https://esm.sh/react@^19.2.4/",
    "react": "https://esm.sh/react@^19.2.4"
  }
}
</script>
<link rel="stylesheet" href="/index.css">

<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-846VMWZYX5"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-846VMWZYX5', {
    'send_page_view': true,
    'anonymize_ip': true
  });
</script>

</head>
<body>
    <div id="desktop-splash"></div>
    <div id="root"></div>
<script type="module" src="/index.tsx"></script>
</body>
</html>`;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle /r/:slug routes for social media crawlers
  if (!path.startsWith('/r/')) {
    return context.next();
  }

  // Check if request is from a social media crawler
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram|slack/i.test(userAgent);

  // If not a crawler, let the React app handle it
  if (!isCrawler) {
    return context.next();
  }

  // Extract slug from path
  const slug = path.replace('/r/', '');
  
  // Fetch restaurant data
  const restaurant = await getRestaurantBySlug(slug);
  
  // Generate HTML with dynamic OG tags
  const html = generateHTML(restaurant, request.url);
  
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
