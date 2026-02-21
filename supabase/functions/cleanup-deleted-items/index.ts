import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Delete menu items that were soft-deleted more than 7 days ago
    const { data: deletedItems, error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .lt('deleted_at', sevenDaysAgo.toISOString())
      .not('deleted_at', 'is', null)
      .select('id')

    if (deleteError) {
      console.error('Error deleting old items:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const deletedCount = deletedItems?.length || 0

    console.log(`Cleanup completed: ${deletedCount} items permanently deleted`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        message: `Permanently deleted ${deletedCount} menu items older than 7 days`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
