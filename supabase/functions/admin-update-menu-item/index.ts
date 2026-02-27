import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { itemId, insertData, updateData, adminImpersonatePartnerId } = await req.json();

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // INSERT operation (new item)
    if (insertData) {
      console.log('INSERT operation for admin impersonation');
      
      // Verify the partner_id matches the impersonated partner
      if (adminImpersonatePartnerId && insertData.partner_id !== adminImpersonatePartnerId) {
        return new Response(
          JSON.stringify({ error: 'partner_id does not match impersonated partner' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .insert(insertData)
        .select('*')
        .single();

      if (error) {
        console.error('Insert error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE operation (existing item)
    if (itemId && updateData) {
      console.log('UPDATE operation for admin impersonation');
      
      // Verify the item belongs to the partner being impersonated
      if (adminImpersonatePartnerId) {
        const { data: item } = await supabaseAdmin
          .from('menu_items')
          .select('partner_id')
          .eq('id', itemId)
          .single();

        if (item?.partner_id !== adminImpersonatePartnerId) {
          return new Response(
            JSON.stringify({ error: 'Item does not belong to impersonated partner' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { data, error } = await supabaseAdmin
        .from('menu_items')
        .update(updateData)
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) {
        console.error('Update error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Missing itemId/updateData or insertData' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
