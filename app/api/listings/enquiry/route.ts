import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { listing_id, name, email, phone, message } = await req.json()
    if (!listing_id || !name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )

    // Get the listing and owner contact details
    const { data: listing } = await supabase
      .from('listings')
      .select('address, raw_data')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
    const ownerEmail = rd?.contact?.email
    const ownerName = rd?.contact?.name

    console.log(`[ENQUIRY] ${listing.address} | From: ${name} <${email}> | To: ${ownerEmail}`)
    console.log(`[ENQUIRY] Message: ${message}`)

    // Send email to owner if Resend is configured
    if (ownerEmail && process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NestLondon <hello@nestlondon.co.uk>',
          to: ownerEmail,
          reply_to: email,
          subject: `New enquiry for ${listing.address}`,
          text: `Hi ${ownerName},\n\nYou have a new enquiry for your property at ${listing.address}.\n\nFrom: ${name}\nEmail: ${email}${phone ? '\nPhone: ' + phone : ''}\n\nMessage:\n${message}\n\nYou can reply directly to this email to respond to ${name}.\n\nNestLondon`
        })
      })
    }

    // Also send confirmation to enquirer
    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NestLondon <hello@nestlondon.co.uk>',
          to: email,
          subject: `Your enquiry for ${listing.address}`,
          text: `Hi ${name},\n\nThank you for your enquiry about ${listing.address}. We've forwarded your message to the owner and they'll be in touch shortly.\n\nNestLondon`
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Enquiry error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
