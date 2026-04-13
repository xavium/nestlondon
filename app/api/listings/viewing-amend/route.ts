import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { viewing_id, action, message, new_slots } = await req.json()
    // action: 'cancel' | 'request_amendment'

    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: viewing } = await supabase
      .from('viewing_requests')
      .select('*, listings(address, agent_id, raw_data)')
      .eq('id', viewing_id)
      .maybeSingle()

    if (!viewing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const listing = viewing.listings as any
    const isOwner = listing?.agent_id === user.id
    const isTenant = viewing.tenant_email === user.email
    if (!isOwner && !isTenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (action === 'cancel') {
      await supabase.from('viewing_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', viewing_id)

      // Email the other party
      if (process.env.RESEND_API_KEY) {
        const toEmail = isOwner ? viewing.tenant_email : (listing?.raw_data?.contact?.email)
        const toName = isOwner ? viewing.tenant_name : 'the owner'
        const fromLabel = isOwner ? 'The owner' : viewing.tenant_name

        if (toEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'NestLondon <onboarding@resend.dev>',
              to: toEmail,
              subject: `Viewing cancelled — ${listing?.address}`,
              text: [
                `Hi ${toName},`,
                ``,
                `${fromLabel} has cancelled the viewing for ${listing?.address}.`,
                message ? `\nReason: ${message}` : '',
                ``,
                `You can arrange a new viewing at: ${siteUrl}/listings/${viewing.listing_id}`,
                ``,
                `— NestLondon`,
              ].join('\n'),
            }),
          })
        }
      }
      return NextResponse.json({ success: true, status: 'cancelled' })
    }

    if (action === 'request_amendment') {
      // Update slots and reset to pending
      const update: any = {
        status: 'pending',
        updated_at: new Date().toISOString(),
      }
      if (new_slots?.length) update.slots = new_slots

      await supabase.from('viewing_requests').update(update).eq('id', viewing_id)

      // Email the other party
      if (process.env.RESEND_API_KEY) {
        const toEmail = isOwner
          ? viewing.tenant_email
          : (typeof listing?.raw_data === 'string' ? JSON.parse(listing.raw_data) : listing?.raw_data)?.contact?.email
        const fromLabel = isOwner ? 'The owner' : viewing.tenant_name

        if (toEmail) {
          const slotsText = (new_slots || viewing.slots || [])
            .map((s: any) => `• ${s.date} at ${s.time}`).join('\n')
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'NestLondon <onboarding@resend.dev>',
              to: toEmail,
              subject: `Viewing amendment requested — ${listing?.address}`,
              text: [
                `Hi,`,
                ``,
                `${fromLabel} has requested an amendment to the viewing for ${listing?.address}.`,
                message ? `\nMessage: ${message}` : '',
                new_slots?.length ? `\nNew availability:\n${slotsText}` : '',
                ``,
                `Manage viewings: ${siteUrl}/${isOwner ? 'dashboard/owner' : 'viewings'}`,
                ``,
                `— NestLondon`,
              ].join('\n'),
            }),
          })
        }
      }
      return NextResponse.json({ success: true, status: 'pending' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
