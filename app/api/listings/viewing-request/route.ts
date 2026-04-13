import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

    const profileLines: string[] = []
    if (renterProfile) {
      profileLines.push('')
      profileLines.push('── Applicant profile ──────────────────')
      if (renterProfile.phone)                    profileLines.push('Phone:             ' + renterProfile.phone)
      if (renterProfile.time_at_current_address)  profileLines.push('Time at address:   ' + renterProfile.time_at_current_address)
      if (renterProfile.reason_for_moving)        profileLines.push('Reason for moving: ' + renterProfile.reason_for_moving)
      if (renterProfile.employment_status)        profileLines.push('Employment:        ' + renterProfile.employment_status.replace(/_/g, ' '))
      if (renterProfile.job_title)                profileLines.push('Job title:         ' + renterProfile.job_title)
      if (renterProfile.move_in_date)             profileLines.push('Move-in date:      ' + renterProfile.move_in_date)
      if (renterProfile.tenancy_length)           profileLines.push('Tenancy length:    ' + renterProfile.tenancy_length)
      if (renterProfile.num_occupants)            profileLines.push('Occupants:         ' + renterProfile.num_occupants)
      profileLines.push('Pets:              ' + (renterProfile.has_pets ? (renterProfile.pet_details || 'Yes') : 'No'))
      profileLines.push('Smoker:            ' + (renterProfile.is_smoker ? 'Yes' : 'No'))
      if (renterProfile.right_to_rent)            profileLines.push('Right to rent:     ' + renterProfile.right_to_rent.replace(/_/g, ' '))
      if (renterProfile.additional_info)          profileLines.push('Additional info:   ' + renterProfile.additional_info)
      profileLines.push('────────────────────────────────────────')
    }

    console.log('[VIEWING REQUEST] ' + listing.address + ' | ' + tenant_name + ' <' + tenant_email + '> | ' + JSON.stringify(slots))

    if (ownerEmail && process.env.RESEND_API_KEY) {
      const slotsText = slots.map((s: any) => '  ' + s.date + ' at ' + s.time).join('\n')
      const emailLines = [
        'Hi ' + (ownerName || 'there') + ',',
        '',
        tenant_name + ' wants to view ' + listing.address + '.',
        '',
        'Available slots:',
        slotsText,
        '',
        'Contact: ' + tenant_email + (tenant_phone ? ' / ' + tenant_phone : ''),
      ]
      emailLines.push(...profileLines)
      emailLines.push('')
      emailLines.push('Log in to respond: ' + siteUrl + '/dashboard/owner')
      emailLines.push('')
      emailLines.push('— NestLondon')

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NestLondon <onboarding@resend.dev>',
          to: ownerEmail,
          subject: 'New viewing request — ' + listing.address,
          text: emailLines.join('\n'),
        })
      })
    }

    return NextResponse.json({ success: true, id: request.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
