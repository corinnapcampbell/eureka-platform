// ots-check-status — checks all pending OTS timestamps against calendar servers.
// Called every 30 minutes by pg_cron. Not user-facing.
//
// Logic per idea:
//   - Any calendar returns 200 → mark complete, notify owner.
//   - ots_submitted_at > 48h ago and still 404 everywhere → mark failed, notify owner.
//   - Otherwise → increment ots_retry_count, stay pending.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CALENDARS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

const FAILURE_HOURS = 48

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const { data: pending, error } = await supabase
      .from('ideas')
      .select('id, title, ots_content_hash, ots_submitted_at, ots_retry_count')
      .eq('ots_status', 'pending')

    if (error) throw error

    const results: Record<string, unknown>[] = []

    for (const idea of pending ?? []) {
      const hashHex = idea.ots_content_hash
      if (!hashHex) continue

      // Check each calendar for confirmation (GET /timestamp/{hex}).
      let confirmed = false
      for (const cal of CALENDARS) {
        try {
          const res = await fetch(`${cal}/timestamp/${hashHex}`)
          if (res.ok) {
            confirmed = true
            console.log(`[ots-check] ${idea.id} confirmed by ${cal}`)
            break
          }
          // 404 = still pending — expected, continue
        } catch (err) {
          console.warn(`[ots-check] ${cal} unreachable: ${(err as Error).message}`)
        }
      }

      const submittedAt = new Date(idea.ots_submitted_at)
      const hoursSince = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60)
      const newRetryCount = (idea.ots_retry_count ?? 0) + 1

      if (confirmed) {
        await supabase
          .from('ideas')
          .update({ ots_status: 'complete', ots_confirmed_at: new Date().toISOString() })
          .eq('id', idea.id)

        await notifyOwner(supabaseUrl, serviceKey, idea.id, {
          type: 'ots_confirmed',
          title: 'Bitcoin timestamp confirmed',
          message: `Your idea "${idea.title}" has been permanently timestamped on the Bitcoin blockchain.`,
        })

        results.push({ idea_id: idea.id, result: 'confirmed' })
      } else if (hoursSince >= FAILURE_HOURS) {
        await supabase
          .from('ideas')
          .update({ ots_status: 'failed', ots_retry_count: newRetryCount })
          .eq('id', idea.id)

        await notifyOwner(supabaseUrl, serviceKey, idea.id, {
          type: 'ots_failed',
          title: 'Timestamp confirmation timed out',
          message: `The Bitcoin timestamp for "${idea.title}" could not be confirmed after 48 hours. Open your idea to retry.`,
        })

        results.push({ idea_id: idea.id, result: 'failed', hours_elapsed: Math.round(hoursSince) })
      } else {
        await supabase
          .from('ideas')
          .update({ ots_retry_count: newRetryCount })
          .eq('id', idea.id)

        results.push({
          idea_id: idea.id,
          result: 'still_pending',
          retry_count: newRetryCount,
          hours_elapsed: Math.round(hoursSince * 10) / 10,
        })
      }
    }

    console.log(`[ots-check] checked ${pending?.length ?? 0} pending ideas`)

    return new Response(
      JSON.stringify({ ok: true, checked: pending?.length ?? 0, results }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[ots-check] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function notifyOwner(
  supabaseUrl: string,
  serviceKey: string,
  ideaId: string,
  payload: { type: string; title: string; message: string },
) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ idea_id: ideaId, ...payload }),
    })
  } catch (err) {
    console.warn(`[ots-check] notify failed for ${ideaId}: ${(err as Error).message}`)
  }
}
