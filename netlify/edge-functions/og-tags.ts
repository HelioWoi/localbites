const DEFAULT_OG_IMAGE = "https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img-site.jpg";
const DEFAULT_OG_TITLE = "MenuLove™ - Video Menus for Restaurants";
const DEFAULT_OG_DESCRIPTION = "Transform your restaurant menu with engaging video content.";

interface Partner {
  restaurant_name: string;
  slug: string;
  photo_url?: string;
  logo_url?: string;
  cover_photo_url?: string;
  banner_images?: string[];
}

interface Dish {
  id: string;
  name: string;
  video_url?: string;
  thumbnail_url?: string;
}

async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  try {
    const supabaseUrl = "https://quybuvapflnzcaedjbkl.supabase.co";
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
    
    if (!supabaseKey) return null;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/partners?slug=eq.${slug}&select=restaurant_name,slug,photo_url,logo_url,cover_photo_url,banner_images`,
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
    console.error("Error fetching partner:", error);
    return null;
  }
}

async function getDishById(dishId: string): Promise<Dish | null> {
  try {
    const supabaseUrl = "https://quybuvapflnzcaedjbkl.supabase.co";
    const supabaseKey = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
    
    if (!supabaseKey) return null;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/menu_items?id=eq.${dishId}&select=id,name,video_url,thumbnail_url`,
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
    console.error("Error fetching dish:", error);
    return null;
  }
}

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/r/")) {
      return context.next();
    }

    // Extract slug from path like /r/slug or /r/slug/menu
    const pathParts = path.replace("/r/", "").split("/");
    const slug = pathParts[0];
    
    if (!slug) {
      return context.next();
    }

    const partner = await getPartnerBySlug(slug);
    
    // Check if URL has ?dish=id parameter for dish-specific OG tags
    const dishId = url.searchParams.get("dish");
    const dish = dishId ? await getDishById(dishId) : null;
    
    const response = await context.next();
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return response;
    }

    let html = await response.text();

    // Use dish-specific OG tags if dish is found, otherwise use restaurant OG tags
    let ogTitle: string;
    let ogDescription: string;
    let ogImage: string;
    
    if (dish && partner) {
      // Dish-specific OG tags
      ogTitle = dish.name;
      ogDescription = `${partner.restaurant_name} - ${dish.name}`;
      // Use dish thumbnail if available, otherwise use restaurant photo (facade)
      ogImage = dish.thumbnail_url || partner.photo_url || partner.logo_url || partner.cover_photo_url || DEFAULT_OG_IMAGE;
    } else if (partner) {
      // Restaurant OG tags
      ogTitle = partner.restaurant_name;
      ogDescription = `Explore the menu of ${partner.restaurant_name} through short videos.`;
      ogImage = partner.photo_url || partner.logo_url || partner.cover_photo_url || DEFAULT_OG_IMAGE;
    } else {
      // Default OG tags
      ogTitle = DEFAULT_OG_TITLE;
      ogDescription = DEFAULT_OG_DESCRIPTION;
      ogImage = DEFAULT_OG_IMAGE;
    }
    
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

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error("OG Edge Function error:", error);
    return context.next();
  }
};
