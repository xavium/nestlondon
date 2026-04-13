import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')
  if (secret !== (process.env.ALERTS_SECRET || 'nestlondon-alerts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: viewings } = await supabase
    .from('viewing_requests')
    .select('*, listings(address, source_url)')
    .eq('status', 'confirmed')
    .eq('proposed_slot->>date', tomorrowStr)

  if (!viewings?.length) {
    return NextResponse.json({ sent: 0, message: 'No viewings tomorrow' })
  }

  let sent = 0
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nestlondon.co.uk'

  for (const v of viewings) {
    try {
      const listing = v.listings as any
      const slot = v.proposed_slot as { date: string; time: string }
      const address = listing?.address || 'your property viewing'
      const date = new Date(slot.date + 'T12:00:00')
      const dateFormatted = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

      if (process.env.RESEND_API_KEY) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'NestLondon <onboarding@resend.dev>',
            to: v.tenant_email,
            subject: `Reminder: Viewing tomorrow at ${address}`,
            text: ['Hi ' + v.tenant_name + ',', '', 'Reminder: you have a viewing tomorrow.', '', 'Property:  ' + address, 'Date:      ' + dateFormatted, 'Time:      ' + slot.time, '', 'View your viewings: ' + siteUrl + '/viewings', '', 'Good luck!', '— NestLondon'].join('\n'),
          }),
        })
        if (res.ok) sent++
        else console.error('[REMINDERS] Resend error:', await res.text())
      } else {
        console.log('[REMINDERS] Would email', v.tenant_email, 'about', address, 'at', slot.time)
        sent++
      }
    } catch (e: any) {
      console.error('[REMINDERS] Error:', e.message)
    }
  }

  return NextResponse.json({ sent, total: viewings.length })
}
