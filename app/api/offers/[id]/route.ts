import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ALLOWED = new Set(['new', 'viewed', 'accepted', 'rejected', 'withdrawn'])

const REJECT_REASONS = new Set(['too_low', 'already_accepted_other', 'unsuitable_terms', 'other'])
const REJECT_REASON_LABELS: Record<string, string> = {
  too_low: 'Offer was too low',
  already_accepted_other: 'Another offer was already accepted',
  unsuitable_terms: 'Terms were unsuitable',
  other: 'Other',
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, status_reason, status_note } = body as {
    status?: string
    status_reason?: string
    status_note?: string
  }
  if (!status || !ALLOWED.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (status === 'rejected' && status_reason && !REJECT_REASONS.has(status_reason)) {
    return NextResponse.json({ error: 'Invalid reject reason' }, { status: 400 })
  }

  const sb = svc()

  // Verify the offer is on a listing this user owns/manages
  const { data: offer } = await sb.from('offers')
    .select('id, listing_id, offer_type, offer_amount, offerer_name, offerer_email')
    .eq('id', id).maybeSingle()
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

  const { data: listing } = await sb.from('listings')
    .select('id, address, agent_id, raw_data')
    .eq('id', offer.listing_id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Authorization: caller must be the agent (agency owner) OR an agency_agent member OR the listing owner
  let authorized = false
  if (listing.agent_id === user.id) authorized = true
  if (!authorized && listing.agent_id) {
    const { data: member } = await sb.from('agency_agents')
      .select('id').eq('agency_id', listing.agent_id).eq('auth_user_id', user.id).maybeSingle()
    if (member) authorized = true
  }
  if (!authorized) {
    const ownerEmail = listing.raw_data?.contact?.email
    if (ownerEmail && ownerEmail.toLowerCase() === (user.email || '').toLowerCase()) authorized = true
  }
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, any> = { status }
  if (status === 'rejected') {
    // Persist combined reason: preset label + optional free-text note.
    const label = status_reason ? REJECT_REASON_LABELS[status_reason] : null
    const note = status_note?.trim()
    updates.status_reason = [label, note].filter(Boolean).join(' — ') || null
  } else {
    updates.status_reason = null
  }

  const { error } = await sb.from('offers').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send notification emails on accept/reject. Best-effort; do not fail the
  // request if Resend is down.
  if ((status === 'accepted' || status === 'rejected') && process.env.RESEND_API_KEY) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nestlondon.co.uk'
    const ownerEmail = (listing.raw_data as any)?.contact?.email || null
    const recipients = [offer.offerer_email, ownerEmail].filter(Boolean) as string[]
    const verb = status === 'accepted' ? 'accepted' : 'declined'
    const amountStr = '£' + Number(offer.offer_amount).toLocaleString() + (offer.offer_type === 'rent' ? '/mo' : '')
    const reasonLine = updates.status_reason ? `\nReason: ${updates.status_reason}\n` : ''
    const tenantCta = status === 'rejected'
      ? `\nYou can submit a revised offer here: ${siteUrl}/listings/${listing.id}/offer\n`
      : `\nView your offers: ${siteUrl}/offers\n`

    for (const to of recipients) {
      const isTenant = to.toLowerCase() === offer.offerer_email.toLowerCase()
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NestLondon <onboarding@resend.dev>',
            to,
            subject: `Offer ${verb} — ${listing.address}`,
            text: [
              isTenant ? `Hi ${offer.offerer_name},` : 'Hello,',
              '',
              isTenant
                ? `Your offer of ${amountStr} on ${listing.address} has been ${verb}.`
                : `The offer of ${amountStr} from ${offer.offerer_name} on ${listing.address} has been ${verb}.`,
              reasonLine,
              isTenant ? tenantCta : `\nView in your dashboard: ${siteUrl}/dashboard\n`,
              '— NestLondon',
            ].join('\n'),
          }),
        })
      } catch (e: any) {
        console.error('[OFFER PATCH] Email error to', to, e.message)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
