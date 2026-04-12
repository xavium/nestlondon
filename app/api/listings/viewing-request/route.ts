import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { listing_id, tenant_name, tenant_email, tenant_phone, message, slots } = await req.json()
    if (!listing_id || !tenant_name || !tenant_email || !slots) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )
    const { data: listing } = await supabase.from('listings').select('address, raw_data').eq('id', listing_id).single()
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
    const ownerEmail = rd?.contact?.email
    const ownerName = rd?.contact?.name
    const confirmation_token = randomBytes(32).toString('hex')
    const { data: request, error } = await supabase.from('viewing_requests').insert({
      listing_id, tenant_name, tenant_email, tenant_phone, message, slots, status: 'pending', confirmation_token
    }).select('id').single()
    if (error) throw error
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    console.log(`[VIEWING REQUEST] ${listing.address} | ${tenant_name} <${tenant_email}> | ${JSON.stringify(slots)}`)
    if (ownerEmail && process.env.RESEND_API_KEY) {
      const slotsText = slots.map((s: any) => `• ${s.date} at ${s.time}`).join('\n')
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'NestLondon <hello@nestlondon.co.uk>', to: ownerEmail,
          subject: `New viewing request — ${listing.address}`,
          text: `Hi ${ownerName},\n\n${tenant_name} wants to view ${listing.address}.\n\nAvailable:\n${slotsText}\n\nContact: ${tenant_email}${tenant_phone ? ' / ' + tenant_phone : ''}\n\nLog in to propose a slot:\n${siteUrl}/dashboard/owner\n\nNestLondon` })
      })
    }
    return NextResponse.json({ success: true, id: request.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
