import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return new Response(
        JSON.stringify({ error: 'Partner ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role (admin privileges)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[Delete Partner] Starting deletion for partner: ${partnerId}`);

    // 1. Get partner data first
    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (fetchError || !partner) {
      console.error('[Delete Partner] Partner not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Partner not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Delete Partner] Found partner: ${partner.restaurant_name}`);

    // 2. Get all menu items to delete their storage files
    const { data: menuItems, error: menuFetchError } = await supabase
      .from('menu_items')
      .select('video_url, photo_url, thumbnail_url')
      .eq('partner_id', partnerId);

    if (menuFetchError) {
      console.error('[Delete Partner] Error fetching menu items:', menuFetchError);
    }

    // 3. Delete storage files for menu items (non-blocking - continue even if files don't exist)
    if (menuItems && menuItems.length > 0) {
      console.log(`[Delete Partner] Deleting ${menuItems.length} menu item files...`);
      
      for (const item of menuItems) {
        try {
          // Delete video
          if (item.video_url) {
            const videoPath = item.video_url.split('/media/')[1];
            if (videoPath) {
              const { error } = await supabase.storage.from('media').remove([videoPath]);
              if (!error) console.log(`[Delete Partner] Deleted video: ${videoPath}`);
            }
          }

          // Delete photo
          if (item.photo_url) {
            const photoPath = item.photo_url.split('/media/')[1];
            if (photoPath) {
              const { error } = await supabase.storage.from('media').remove([photoPath]);
              if (!error) console.log(`[Delete Partner] Deleted photo: ${photoPath}`);
            }
          }

          // Delete thumbnail
          if (item.thumbnail_url) {
            const thumbPath = item.thumbnail_url.split('/media/')[1];
            if (thumbPath) {
              const { error } = await supabase.storage.from('media').remove([thumbPath]);
              if (!error) console.log(`[Delete Partner] Deleted thumbnail: ${thumbPath}`);
            }
          }
        } catch (storageError) {
          console.warn('[Delete Partner] Storage deletion error (non-critical):', storageError);
        }
      }
    }

    // 4. Delete partner photo (non-blocking)
    try {
      if (partner.photo_url) {
        const partnerPhotoPath = partner.photo_url.split('/media/')[1];
        if (partnerPhotoPath) {
          await supabase.storage.from('media').remove([partnerPhotoPath]);
          console.log(`[Delete Partner] Deleted partner photo: ${partnerPhotoPath}`);
        }
      }
    } catch (error) {
      console.warn('[Delete Partner] Partner photo deletion error (non-critical):', error);
    }

    // 5. Delete cover photo (non-blocking)
    try {
      if (partner.cover_photo_url) {
        const coverPhotoPath = partner.cover_photo_url.split('/media/')[1];
        if (coverPhotoPath) {
          await supabase.storage.from('media').remove([coverPhotoPath]);
          console.log(`[Delete Partner] Deleted cover photo: ${coverPhotoPath}`);
        }
      }
    } catch (error) {
      console.warn('[Delete Partner] Cover photo deletion error (non-critical):', error);
    }

    // 6. Delete menu items from database
    const { error: menuDeleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('partner_id', partnerId);

    if (menuDeleteError) {
      console.error('[Delete Partner] Error deleting menu items:', menuDeleteError);
      throw new Error(`Failed to delete menu items: ${menuDeleteError.message}`);
    }

    console.log('[Delete Partner] Deleted menu items from database');

    // 7. Delete analytics/interactions data
    const { error: analyticsError } = await supabase
      .from('partner_analytics')
      .delete()
      .eq('partner_id', partnerId);

    if (analyticsError) {
      console.warn('[Delete Partner] Error deleting analytics:', analyticsError);
    }

    // 8. Delete partner from database
    const { error: partnerDeleteError } = await supabase
      .from('partners')
      .delete()
      .eq('id', partnerId);

    if (partnerDeleteError) {
      console.error('[Delete Partner] Error deleting partner:', partnerDeleteError);
      throw new Error(`Failed to delete partner: ${partnerDeleteError.message}`);
    }

    console.log('[Delete Partner] Deleted partner from database');

    // 9. Delete auth user account (CRITICAL - removes login access)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(partnerId);

    if (authDeleteError) {
      console.error('[Delete Partner] Error deleting auth user:', authDeleteError);
      // Don't throw - partner data is already deleted, just log the error
      console.warn('[Delete Partner] Auth account may still exist, but partner data is deleted');
    } else {
      console.log('[Delete Partner] Deleted auth account');
    }

    console.log(`[Delete Partner] ✅ Complete deletion successful for: ${partner.restaurant_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Partner ${partner.restaurant_name} completely deleted`,
        deleted: {
          menuItems: menuItems?.length || 0,
          storageFiles: true,
          partnerRecord: true,
          authAccount: !authDeleteError
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Delete Partner] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
