import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { request_id, proposed_slot, confirmed_address } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: viewing } = await supabase
      .from('viewing_requests')
      .select('*, listings(address, agent_id)')
      .eq('id', request_id)
      .maybeSingle()

    if (!viewing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const listing = viewing.listings as any
    if (listing?.agent_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update viewing with proposed slot and confirmed address
    await supabase.from('viewing_requests').update({
      proposed_slot,
      confirmed_address: confirmed_address || null,
      status: 'proposed',
      updated_at: new Date().toISOString(),
    }).eq('id', request_id)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const confirmUrl = `${siteUrl}/viewing/confirm?token=${viewing.confirmation_token}`
    const declineUrl = `${siteUrl}/viewing/confirm?token=${viewing.confirmation_token}&action=decline`
    const displayAddress = confirmed_address || listing?.address || 'the property'

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NestLondon <onboarding@resend.dev>',
          to: viewing.tenant_email,
          subject: `Viewing proposed — ${displayAddress}`,
          text: [
            `Hi ${viewing.tenant_name},`,
            ``,
            `The owner has proposed a viewing time.`,
            ``,
            `Property: ${displayAddress}`,
            `Date:     ${proposed_slot.date}`,
            `Time:     ${proposed_slot.time}`,
            proposed_slot.note ? `Note:     ${proposed_slot.note}` : '',
            ``,
            `Confirm:  ${confirmUrl}`,
            `Decline:  ${declineUrl}`,
            ``,
            `— NestLondon`,
          ].filter(l => l !== null).join('\n'),
        }),
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
