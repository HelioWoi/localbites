const DEFAULT_OG_IMAGE = "https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img-site.jpg";
const DEFAULT_OG_TITLE = "MenuLove™ - Video Menus for Restaurants";
const DEFAULT_OG_DESCRIPTION = "Transform your restaurant menu with engaging video content.";

interface Restaurant {
  name: string;
  slug: string;
  profile_image_url?: string;
}

async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  try {
    const supabaseUrl = "https://quybuvapflnzcaedjbkl.supabase.co";
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
    
    if (!supabaseKey) return null;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/restaurants?slug=eq.${slug}&select=name,slug,profile_image_url`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return null;
  }
}

export default async (request, context) => {
  const debugHeaders = new Headers();
  debugHeaders.set("x-og-debug-1", "function-started");
  
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/r/")) {
      return context.next();
    }

    const slug = path.replace("/r/", "").split("?")[0];
    debugHeaders.set("x-og-debug-2", `slug-extracted:${slug}`);
    
    if (!slug) {
      return context.next();
    }

    const restaurant = await getRestaurantBySlug(slug);
    debugHeaders.set("x-og-debug-3", `restaurant:${restaurant ? "found" : "not-found"}`);
    
    const response = await context.next();
    debugHeaders.set("x-og-debug-4", "response-received");
    
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      const passthrough = new Response(response.body, response);
      debugHeaders.forEach((value, key) => passthrough.headers.set(key, value));
      return passthrough;
    }

    let html = await response.text();
    debugHeaders.set("x-og-debug-5", "html-extracted");

    const ogTitle = restaurant ? restaurant.name : DEFAULT_OG_TITLE;
    const ogDescription = restaurant
      ? `Explore the menu of ${restaurant.name} through short videos.`
      : DEFAULT_OG_DESCRIPTION;
    const ogImage = restaurant?.profile_image_url || DEFAULT_OG_IMAGE;
    const ogUrl = request.url;

    html = html
      .replace(/<meta property="og:url" content="[^"]*"[^>]*>/g, `<meta property="og:url" content="${ogUrl}" />`)
      .replace(/<meta property="og:title" content="[^"]*"[^>]*>/g, `<meta property="og:title" content="${ogTitle}" />`)
      .replace(/<meta property="og:description" content="[^"]*"[^>]*>/g, `<meta property="og:description" content="${ogDescription}" />`)
      .replace(/<meta property="og:image" content="[^"]*"[^>]*>/g, `<meta property="og:image" content="${ogImage}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*"[^>]*>/g, `<meta name="twitter:title" content="${ogTitle}" />`)
      .replace(/<meta name="twitter:description" content="[^"]*"[^>]*>/g, `<meta name="twitter:description" content="${ogDescription}" />`)
      .replace(/<meta name="twitter:image" content="[^"]*"[^>]*>/g, `<meta name="twitter:image" content="${ogImage}" />`)
      .replace(/<title>[^<]*<\/title>/g, `<title>${ogTitle}</title>`)
      .replace(/<meta name="description" content="[^"]*"[^>]*>/g, `<meta name="description" content="${ogDescription}" />`);

    const newHeaders = new Headers(response.headers);
    newHeaders.set("content-type", "text/html; charset=utf-8");
    newHeaders.set("cache-control", "public, max-age=0, must-revalidate");
    newHeaders.set("x-og-function", "executed");
    newHeaders.set("x-og-slug", slug);
    newHeaders.set("x-og-restaurant-found", restaurant ? "yes" : "no");
    // Encode title to ASCII-safe string for header
    newHeaders.set("x-og-title", encodeURIComponent(ogTitle));
    
    debugHeaders.forEach((value, key) => newHeaders.set(key, value));
    newHeaders.set("x-og-debug-6", "returning-modified-html");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("OG Edge Function error:", error);
    const errorResponse = await context.next();
    debugHeaders.set("x-og-error", String(error));
    debugHeaders.forEach((value, key) => errorResponse.headers.set(key, value));
    return errorResponse;
  }
};
