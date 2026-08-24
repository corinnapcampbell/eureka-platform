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

// ---- OpenTimestamps binary proof parsing ----
// Calendars index by the commitment produced by the operations inside the proof
// they returned at submission — NOT by our own content hash. These helpers walk
// that proof to recover the real commitment, then read the calendar's upgraded
// response for a Bitcoin attestation.

const OTS_PENDING_TAG = '83dfe30d2ef90c8e'
const OTS_BITCOIN_TAG = '0588960d73d71901'

type OtsAttestation =
  | { kind: 'pending'; msg: Uint8Array; uri: string }
  | { kind: 'bitcoin'; msg: Uint8Array; height: number }

function otsToHex(u8: Uint8Array): string {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function otsFromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

function otsFromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function otsConcat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

class OtsReader {
  b: Uint8Array
  i = 0
  constructor(b: Uint8Array) { this.b = b }
  u8(): number { return this.b[this.i++] }
  varuint(): number {
    let v = 0, s = 0
    for (;;) {
      const c = this.u8()
      v |= (c & 0x7f) << s
      if (!(c & 0x80)) return v
      s += 7
    }
  }
  varbytes(): Uint8Array {
    const n = this.varuint()
    const v = this.b.slice(this.i, this.i + n)
    this.i += n
    return v
  }
  eof(): boolean { return this.i >= this.b.length }
}

async function otsWalk(startMsg: Uint8Array, r: OtsReader): Promise<OtsAttestation[]> {
  let msg = startMsg
  const found: OtsAttestation[] = []
  while (!r.eof()) {
    const op = r.u8()
    if (op === 0x00) {
      const tag = otsToHex(r.b.slice(r.i, r.i + 8))
      r.i += 8
      const payload = r.varbytes()
      if (tag === OTS_PENDING_TAG) {
        const pr = new OtsReader(payload)
        found.push({ kind: 'pending', msg, uri: new TextDecoder().decode(pr.varbytes()) })
      } else if (tag === OTS_BITCOIN_TAG) {
        const pr = new OtsReader(payload)
        found.push({ kind: 'bitcoin', msg, height: pr.varuint() })
      }
    } else if (op === 0xff) {
      for (const f of await otsWalk(msg, r)) found.push(f)
    } else if (op === 0xf0) {
      msg = otsConcat(msg, r.varbytes())
    } else if (op === 0xf1) {
      msg = otsConcat(r.varbytes(), msg)
    } else if (op === 0xf2) {
      msg = msg.slice().reverse()
    } else if (op === 0x08) {
      msg = new Uint8Array(await crypto.subtle.digest('SHA-256', msg))
    } else if (op === 0x02) {
      msg = new Uint8Array(await crypto.subtle.digest('SHA-1', msg))
    } else {
      console.warn(`[ots-check] unsupported opcode 0x${op.toString(16)}`)
      break
    }
  }
  return found
}

async function checkIdeaAnchor(
  contentHash: string,
  otsProof: unknown,
): Promise<{ confirmed: boolean; height: number; merkleRoot: string; calendar: string }> {
  const result = { confirmed: false, height: 0, merkleRoot: '', calendar: '' }
  const proofs = Array.isArray(otsProof) ? (otsProof as Record<string, unknown>[]) : []
  const digest = otsFromHex(contentHash)

  for (const entry of proofs) {
    const b64 = entry?.proof_base64
    if (typeof b64 !== 'string' || !b64) continue

    let atts: OtsAttestation[]
    try {
      atts = await otsWalk(digest, new OtsReader(otsFromBase64(b64)))
    } catch (err) {
      console.warn(`[ots-check] proof parse failed: ${(err as Error).message}`)
      continue
    }

    for (const p of atts) {
      if (p.kind !== 'pending') continue
      const commitment = otsToHex(p.msg)
      try {
        const res = await fetch(`${p.uri}/timestamp/${commitment}`)
        if (!res.ok) continue
        const upgraded = new Uint8Array(await res.arrayBuffer())
        const upAtts = await otsWalk(p.msg, new OtsReader(upgraded))
        const btc = upAtts.find((a) => a.kind === 'bitcoin')
        if (btc && btc.kind === 'bitcoin') {
          result.confirmed = true
          result.height = btc.height
          result.merkleRoot = otsToHex(btc.msg.slice().reverse())
          result.calendar = p.uri
          return result
        }
      } catch (err) {
        console.warn(`[ots-check] ${p.uri} — ${(err as Error).message}`)
      }
    }
  }
  return result
}

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
      .select('id, title, ots_content_hash, ots_submitted_at, ots_retry_count, ots_status, ots_proof')
      .in('ots_status', ['pending', 'failed'])

    if (error) throw error

    const results: Record<string, unknown>[] = []

    for (const idea of pending ?? []) {
      const hashHex = idea.ots_content_hash
      if (!hashHex) continue

      const anchor = await checkIdeaAnchor(hashHex, idea.ots_proof)
      const confirmed = anchor.confirmed
      if (confirmed) {
        console.log(`[ots-check] ${idea.id} confirmed by ${anchor.calendar} — block ${anchor.height}`)
      }

      const submittedAt = new Date(idea.ots_submitted_at)
      const hoursSince = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60)
      const newRetryCount = (idea.ots_retry_count ?? 0) + 1

      if (confirmed) {
        await supabase
          .from('ideas')
          .update({ ots_status: 'complete', ots_confirmed_at: new Date().toISOString(), ots_block_height: anchor.height, ots_merkle_root: anchor.merkleRoot })
          .eq('id', idea.id)

        await notifyOwner(supabaseUrl, serviceKey, idea.id, {
          type: 'ots_confirmed',
          title: 'Bitcoin timestamp confirmed',
          message: `Your idea "${idea.title}" has been permanently timestamped on the Bitcoin blockchain.`,
        })

        results.push({ idea_id: idea.id, result: 'confirmed' })
      } else if (hoursSince >= FAILURE_HOURS && idea.ots_status !== 'failed') {
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
      } else if (idea.ots_status === 'failed') {
        results.push({ idea_id: idea.id, result: 'still_failed_rechecking' })
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
    const notifyRes = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ idea_id: ideaId, ...payload }),
    })
        if (!notifyRes.ok) {
          console.error(`[ots-check] create-notification returned ${notifyRes.status} for ${ideaId}: ${await notifyRes.text()}`)
        }
  } catch (err) {
    console.warn(`[ots-check] notify failed for ${ideaId}: ${(err as Error).message}`)
  }
}
