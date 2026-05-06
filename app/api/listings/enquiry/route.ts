import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { listing_id, name, email, phone, message } = await req.json()
    const missing = []
    if (!listing_id) missing.push('listing_id')
    if (!name) missing.push('name')
    if (!email) missing.push('email')
    if (!message) missing.push('message')
    if (missing.length) {
      return NextResponse.json({ error: 'Missing required fields: ' + missing.join(', ') }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )

    const { data: listing } = await supabase
      .from('listings')
      .select('address, raw_data')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
    const ownerEmail = rd?.contact?.email
    const ownerName = rd?.contact?.name

    // Fetch renter profile if logged in
    let renterProfile: any = null
    try {
      const cookieStore = await cookies()
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const { data } = await supabase.from('renter_profiles').select('*').eq('user_id', user.id).maybeSingle()
        renterProfile = data
      }
    } catch {}

    const lines: string[] = []
    if (renterProfile) {
      lines.push('')
      lines.push('── Applicant profile ──────────────────')
      if (renterProfile.phone)                   lines.push('Phone:             ' + renterProfile.phone)
      if (renterProfile.time_at_current_address)  lines.push('Time at address:   ' + renterProfile.time_at_current_address)
      if (renterProfile.reason_for_moving)        lines.push('Reason for moving: ' + renterProfile.reason_for_moving)
      if (renterProfile.employment_status)        lines.push('Employment:        ' + renterProfile.employment_status.replace(/_/g, ' '))
      if (renterProfile.job_title)                lines.push('Job title:         ' + renterProfile.job_title)
      if (renterProfile.move_in_date)             lines.push('Move-in date:      ' + renterProfile.move_in_date)
      if (renterProfile.tenancy_length)           lines.push('Tenancy length:    ' + renterProfile.tenancy_length)
      if (renterProfile.num_occupants)            lines.push('Occupants:         ' + renterProfile.num_occupants)
      lines.push('Pets:              ' + (renterProfile.has_pets ? (renterProfile.pet_details || 'Yes') : 'No'))
      lines.push('Smoker:            ' + (renterProfile.is_smoker ? 'Yes' : 'No'))
      if (renterProfile.right_to_rent)            lines.push('Right to rent:     ' + renterProfile.right_to_rent.replace(/_/g, ' '))
      if (renterProfile.additional_info)          lines.push('Additional info:   ' + renterProfile.additional_info)
      lines.push('────────────────────────────────────────')
    }
    const profileSection = lines.join('\n')

    console.log('[ENQUIRY] ' + listing.address + ' | From: ' + name + ' <' + email + '> | To: ' + ownerEmail)

    // Insert message into messages table so it appears in inbox
    let authedUser: any = null
    try {
      const cookieStore = await cookies()
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await authClient.auth.getUser()
      authedUser = user
    } catch {}

    try {
      // Resolve recipient (listing's agent_id)
      const { data: listingForMsg } = await supabase
        .from('listings').select('agent_id').eq('id', listing_id).maybeSingle()
      const recipientId = listingForMsg?.agent_id || null

      const { data: msg } = await supabase.from('messages').insert({
        listing_id,
        from_user_id: authedUser?.id ?? null,
        from_name: name,
        from_email: email,
        to_user_id: recipientId,
        body: message + (profileSection ? '\n\n' + profileSection : ''),
        thread_id: '00000000-0000-0000-0000-000000000000',
      }).select('id').single()
      // Set thread_id = message id for new threads
      if (msg) await supabase.from('messages').update({ thread_id: msg.id }).eq('id', msg.id)
    } catch (e) {
      console.error('Failed to insert enquiry into messages table:', e)
    }

    // Auto-save the listing for the user
    if (authedUser) {
      try {
        await supabase.from('saved_properties').upsert(
          { user_id: authedUser.id, listing_id },
          { onConflict: 'user_id,listing_id' }
        )
      } catch (e) {
        console.error('Failed to auto-save listing:', e)
      }
    }

    if (ownerEmail && process.env.RESEND_API_KEY) {
      const bodyLines = [
        'Hi ' + (ownerName || 'there') + ',',
        '',
        'New enquiry for ' + listing.address + ' from ' + name + '.',
        '',
        'Email: ' + email + (phone ? '\nPhone: ' + phone : ''),
        '',
        'Message:',
        message,
        profileSection,
        '',
        'You can reply directly to this email.',
        '— NestLondon',
      ]
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NestLondon <onboarding@resend.dev>',
          to: ownerEmail,
          reply_to: email,
          subject: 'New enquiry for ' + listing.address,
          text: bodyLines.join('\n'),
        })
      })
    }

    if (process.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NestLondon <onboarding@resend.dev>',
          to: email,
          subject: 'Your enquiry for ' + listing.address,
          text: 'Hi ' + name + ',\n\nThank you for your enquiry about ' + listing.address + '. We have forwarded your message and they will be in touch shortly.\n\n— NestLondon',
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Enquiry error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
