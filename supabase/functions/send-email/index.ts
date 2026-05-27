import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { idea_id, user_id, idea_title, viewer_name, viewer_email, owner_email } = await req.json()

    if (!owner_email) throw new Error('No owner email provided')

    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const fromAddress = 'eurekAIdea <noreply@myeurekaidea.com>'

    // Email to owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: owner_email,
        subject: `${viewer_name} just accessed your idea on eurekAIdea`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e8f0;">
            <div style="background: #0e0e1f; padding: 32px 40px; text-align: center;">
              <span style="font-size: 24px; font-weight: 300; color: #ffffff; letter-spacing: -0.5px;">Eurek<span style="color: #9b7ff7;">AI</span>dea</span>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #0e0e1f; font-size: 20px; font-weight: 600; margin: 0 0 16px;">Your idea was just viewed 👀</h2>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                <strong>${viewer_name}</strong> (${viewer_email}) has accepted the NDA and accessed your idea:
              </p>
              <div style="background: #f5f5fc; border-left: 4px solid #7b9ff7; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
                <p style="color: #0e0e1f; font-size: 16px; font-weight: 600; margin: 0;">${idea_title}</p>
              </div>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                Thank you for trusting eurekAIdea to protect and present your idea. Your innovation is in good hands.
              </p>
              <p style="color: #888; font-size: 13px; margin: 0;">You can view the full access log from your idea's dashboard.</p>
            </div>
            <div style="background: #f9f9fb; padding: 20px 40px; text-align: center; border-top: 1px solid #e8e8f0;">
              <p style="color: #aaa; font-size: 12px; margin: 0;">Protected & Presented by eurekAIdea · myeurekaidea.com</p>
            </div>
          </div>
        `
      })
    })

    // Email to viewer
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: viewer_email,
        subject: `You accessed "${idea_title}" on eurekAIdea`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e8f0;">
            <div style="background: #0e0e1f; padding: 32px 40px; text-align: center;">
              <span style="font-size: 24px; font-weight: 300; color: #ffffff; letter-spacing: -0.5px;">Eurek<span style="color: #9b7ff7;">AI</span>dea</span>
            </div>
            <div style="padding: 40px;">
              <h2 style="color: #0e0e1f; font-size: 20px; font-weight: 600; margin: 0 0 16px;">You're in, ${viewer_name} 🔐</h2>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                You have successfully accepted the NDA and accessed the following protected idea:
              </p>
              <div style="background: #f5f5fc; border-left: 4px solid #9b7ff7; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px;">
                <p style="color: #0e0e1f; font-size: 16px; font-weight: 600; margin: 0;">${idea_title}</p>
              </div>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                By accepting the NDA, you have agreed to keep the contents of this idea confidential. This access has been recorded and timestamped.
              </p>
              <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                eurekAIdea exists to protect great ideas and connect innovators with the right people. We're glad you're here.
              </p>
            </div>
            <div style="background: #f9f9fb; padding: 20px 40px; text-align: center; border-top: 1px solid #e8e8f0;">
              <p style="color: #aaa; font-size: 12px; margin: 0;">Protected & Presented by eurekAIdea · myeurekaidea.com</p>
            </div>
          </div>
        `
      })
    })

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
