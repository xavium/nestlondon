import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Compute "now" in Europe/London as a Date that, when its UTC instant is taken,
// matches London wall-clock. We need this to compare against viewing slot
// strings which are London-local.
function londonNow(): Date {
  const now = new Date()
  // Format current UTC instant as London wall-clock parts, then rebuild.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now).reduce<Record<string, string>>((a, p) => {
    if (p.type !== 'literal') a[p.type] = p.value
    return a
  }, {})
  // Build an ISO-like string treated as UTC so arithmetic is on London wall-clock.
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`)
}

// Parse "HH:mm" or "HH:mm-HH:mm" — return end-of-slot minutes from midnight.
function slotEndMinutes(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/)
  if (!m) return null
  const endH = m[3] ? parseInt(m[3], 10) : parseInt(m[1], 10)
  const endM = m[4] ? parseInt(m[4], 10) : parseInt(m[2], 10)
  return endH * 60 + endM
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')
  if (secret !== (process.env.ALERTS_SECRET || 'nestlondon-alerts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const nowLondon = londonNow()
  const todayStr = nowLondon.toISOString().split('T')[0]
  const yesterdayStr = new Date(nowLondon.getTime() - 24 * 3600_000).toISOString().split('T')[0]

  // Pull confirmed viewings from today or yesterday that haven't had a follow-up.
  // Yesterday is included so a late-evening viewing (e.g. 9pm) still gets caught
  // by the next morning's runs if cron missed the overnight window.
  const { data: viewings } = await supabase
    .from('viewing_requests')
    .select('id, tenant_email, tenant_name, listing_id, proposed_slot, listings(address)')
    .eq('status', 'confirmed')
    .is('followup_sent_at', null)
    .in('proposed_slot->>date', [todayStr, yesterdayStr])

  if (!viewings?.length) {
    return NextResponse.json({ sent: 0, message: 'No follow-ups due' })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nestlondon.co.uk'
  let sent = 0
  let skippedTime = 0
  let skippedHasOffer = 0
  let errored = 0

  for (const v of viewings) {
    try {
      const slot = v.proposed_slot as { date: string; time: string }
      if (!slot?.date || !slot?.time) continue

      // Compute how many minutes have elapsed since the viewing ENDED, in London time.
      const endMin = slotEndMinutes(slot.time)
      if (endMin == null) continue

      const slotEnd = new Date(`${slot.date}T00:00:00Z`)
      slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + endMin)
      const elapsedMin = (nowLondon.getTime() - slotEnd.getTime()) / 60_000

      // 3-hour delay window: fire when 180–240min have passed since slot end.
      // The 60-min window matches the hourly cron cadence; if a run is missed
      // we'll miss this viewing, but followup_sent_at guarantees no double-send.
      if (elapsedMin < 180 || elapsedMin >= 240) {
        skippedTime++
        continue
      }

      // Skip if tenant already submitted an offer on this listing.
      // Match on email since viewing_requests has no user_id column.
      if (v.tenant_email) {
        const { data: existingOffer } = await supabase
          .from('offers')
          .select('id')
          .eq('listing_id', v.listing_id)
          .eq('offerer_email', v.tenant_email.trim().toLowerCase())
          .limit(1)
          .maybeSingle()
        if (existingOffer) {
          // Mark as "handled" so we don't re-check every hour for the next 24h.
          await supabase.from('viewing_requests').update({ followup_sent_at: new Date().toISOString() }).eq('id', v.id)
          skippedHasOffer++
          continue
        }
      }

      const listing = v.listings as { address?: string } | null
      const address = listing?.address || 'the property'
      const offerLink = `${siteUrl}/listings/${v.listing_id}/offer`

      if (process.env.RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NestLondon <onboarding@resend.dev>',
            to: v.tenant_email,
            subject: `How did your viewing at ${address} go?`,
            text: [
              `Hi ${v.tenant_name || 'there'},`,
              '',
              `Hope your viewing at ${address} went well today.`,
              '',
              'If you liked the place, you can put forward an offer here:',
              offerLink,
              '',
              'No pressure — just reply to this email if you have any questions.',
              '',
              '— NestLondon',
            ].join('\n'),
          }),
        })
        if (!res.ok) {
          console.error('[FOLLOWUPS] Resend error for viewing', v.id, ':', await res.text())
          // Mark as handled anyway so we don't retry a bad address every hour.
          await supabase
            .from('viewing_requests')
            .update({ followup_sent_at: new Date().toISOString() })
            .eq('id', v.id)
          errored++
          continue
        }
      } else {
        console.log('[FOLLOWUPS] Would email', v.tenant_email, 'about', address)
      }

      await supabase
        .from('viewing_requests')
        .update({ followup_sent_at: new Date().toISOString() })
        .eq('id', v.id)
      sent++
    } catch (e: any) {
      console.error('[FOLLOWUPS] Error on viewing', v.id, e.message)
      errored++
    }
  }

  return NextResponse.json({
    sent,
    skippedTime,
    skippedHasOffer,
    errored,
    candidates: viewings.length,
  })
}
