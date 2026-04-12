import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'nestlondon-admin-2026'

export async function POST(req: NextRequest) {
  try {
    const { id, action, adminKey } = await req.json()

    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )

    if (action === 'approve') {
      const { error } = await supabase.from('listings').update({ is_active: true }).eq('id', id)
      if (error) throw error

      const { data: listing } = await supabase.from('listings').select('address, raw_data').eq('id', id).single()
      if (listing) {
        const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : listing.raw_data
        const contact = rd?.contact || {}
        if (contact.email) await sendEmail({
          to: contact.email,
          subject: 'Your listing is now live on NestLondon',
          body: `Hi ${contact.name},\n\nYour property at ${listing.address} has been approved and is now live on NestLondon.\n\nView: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/listings/${id}\n\nNestLondon team`
        })
      }

    } else if (action === 'reject') {
      const { data: listing } = await supabase.from('listings').select('address, raw_data').eq('id', id).single()
      if (listing) {
        const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : listing.raw_data
        const contact = rd?.contact || {}
        if (contact.email) await sendEmail({
          to: contact.email,
          subject: 'Update on your NestLondon listing',
          body: `Hi ${contact.name},\n\nThank you for submitting your property at ${listing.address}.\n\nUnfortunately we were unable to approve this listing at this time. Please feel free to resubmit with more details.\n\nNestLondon team`
        })
      }
      const { error } = await supabase.from('listings').delete().eq('id', id)
      if (error) throw error

    } else if (action === 'deactivate') {
      const { error } = await supabase.from('listings').update({ is_active: false }).eq('id', id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function sendEmail({ to, subject, body }: { to: string, subject: string, body: string }) {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
  if (process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'NestLondon <hello@nestlondon.co.uk>', to, subject, text: body })
    })
  }
}
