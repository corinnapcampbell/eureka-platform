const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email) throw new Error('No email provided')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')!

    // Insert to waitlist table — ignore duplicate emails
    const res = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ email }),
    })

    if (!res.ok && res.status !== 409) {
      const err = await res.text()
      throw new Error(`DB insert failed: ${err}`)
    }

    // Send confirmation email via Resend
    if (res.status !== 409) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'eurekAIdea <noreply@myeurekaidea.com>',
          to: email,
          subject: "You're on the eurekAIdea waitlist",
          html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e8f0;">
            <div style="background: #0e0e1f; padding: 32px 40px; text-align: center;">
              <span style="font-size: 24px; font-weight: 300; color: #ffffff; letter-spacing: -0.5px;">Eurek<span style="color: #9b7ff7;">AI</span>dea</span>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #0e0e1f; font-size: 20px; font-weight: 600; margin: 0 0 16px;">You're on the list 🎉</h2>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                Thanks for your interest in eurekAIdea. We're putting the finishing touches on the platform and will let you know the moment we're ready for you.
              </p>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                eurekAIdea protects your ideas with blockchain timestamping, NDA-gated sharing, and AI-powered investor scoring — so you can share your ideas without losing them.
              </p>
              <p style="color: #888; font-size: 13px; margin: 0;">
                We'll be in touch soon.<br/>— The eurekAIdea team
              </p>
            </div>
            <div style="background: #f9f9fb; padding: 20px 40px; text-align: center; border-top: 1px solid #e8e8f0;">
              <p style="color: #aaa; font-size: 12px; margin: 0;">eurekAIdea · myeurekaidea.com</p>
            </div>
          </div>
        `,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('waitlist-signup error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
