import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, type, title, message } = await req.json()

    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '[]')
    const serviceKey = Array.isArray(secretKeys) ? secretKeys[0]?.secret : secretKeys
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceKey
    )

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({ user_id, type, title, message })

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('create-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
