import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: request } = await supabase.from('viewing_requests').select('*, listings(address, raw_data)').eq('confirmation_token', token).single()
    if (!request) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled'
    await supabase.from('viewing_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', request.id)
    const listing = request.listings as any
    const rd = typeof listing?.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing?.raw_data || {})
    const ownerEmail = rd?.contact?.email
    if (action === 'confirm' && ownerEmail && process.env.RESEND_API_KEY) {
      const slot = request.proposed_slot
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'NestLondon <hello@nestlondon.co.uk>', to: ownerEmail,
          subject: `Viewing confirmed — ${listing.address}`,
          text: `${request.tenant_name} confirmed the viewing.\n\nDate: ${slot?.date} at ${slot?.time}\nContact: ${request.tenant_email}` })
      })
    }
    return NextResponse.json({ success: true, status: newStatus, slot: request.proposed_slot, address: listing?.address })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { request_id, proposed_slot, admin_key } = await req.json()
    if (admin_key !== (process.env.ADMIN_SECRET_KEY || 'nestlondon-admin-2026')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: request } = await supabase.from('viewing_requests').select('*, listings(address)').eq('id', request_id).single()
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await supabase.from('viewing_requests').update({ proposed_slot, status: 'proposed', updated_at: new Date().toISOString() }).eq('id', request_id)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const confirmUrl = `${siteUrl}/viewing/confirm?token=${request.confirmation_token}`
    const declineUrl = `${siteUrl}/viewing/confirm?token=${request.confirmation_token}&action=decline`
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'NestLondon <hello@nestlondon.co.uk>', to: request.tenant_email,
          subject: `Viewing proposed — ${(request.listings as any)?.address}`,
          text: `Hi ${request.tenant_name},\n\nThe owner has proposed:\n\nDate: ${proposed_slot.date}\nTime: ${proposed_slot.time}\n\nConfirm: ${confirmUrl}\nDecline: ${declineUrl}\n\nNestLondon` })
      })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
