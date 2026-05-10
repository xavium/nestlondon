import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { canCreateListing } from '@/lib/billing/access'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Resolve current user so we can stamp agent_id for agent-created listings
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()

    // Paywall gate. Page-level redirects handle UX; this is the security boundary.
    if (!user) return NextResponse.json({ error: 'You must be signed in to list' }, { status: 401 })
    const access = await canCreateListing(user.id, user.email)
    if (!access.allowed) {
      const message = access.reason === 'at_listing_cap'
        ? `You've reached the ${access.max_listings}-listing cap on your current plan. Upgrade or remove a listing to add a new one.`
        : 'An active subscription is required to create a listing.'
      return NextResponse.json({ error: message, reason: access.reason }, { status: 402 })
    }
    const {
      name, email, phone, address, borough, postcode,
      property_type, bedrooms, bathrooms, square_feet,
      which_floor, total_floors, floor_layout, epc_rating, council_tax_band,
      price, deposit, available_from, furnished, description, images,
      has_garden, has_balcony, has_terrace, has_parking, has_garage,
      has_concierge, has_lift, has_porter, pets_allowed, bills_included,
      new_build, shared_ownership,
      company_name, company_reg, listing_type, lister,
      floorplans
    } = body

    if (!name || !email || !address || !postcode || !price || !bedrooms) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Geocode postcode → lat/lng via Postcodes.io (UK-specific, free, no API key).
    // Best-effort: if it fails, we still save the listing without coords.
    let latitude: number | null = null
    let longitude: number | null = null
    const cleanedPostcode = String(postcode).trim().toUpperCase().replace(/\s+/g, ' ')
    try {
      const geoRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanedPostcode)}`)
      if (geoRes.ok) {
        const geo = await geoRes.json() as { result?: { latitude: number; longitude: number } }
        if (geo.result?.latitude != null && geo.result?.longitude != null) {
          latitude = geo.result.latitude
          longitude = geo.result.longitude
        }
      }
    } catch (e: any) {
      console.error('[CREATE LISTING] Geocode error for', cleanedPostcode, e.message)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )

    const features: string[] = []
    if (has_garden) features.push('Garden')
    if (has_balcony) features.push('Balcony')
    if (has_terrace) features.push('Terrace')
    if (has_parking) features.push('Parking')
    if (has_garage) features.push('Garage')
    if (has_concierge) features.push('Concierge')
    if (has_lift) features.push('Lift')
    if (has_porter) features.push('Porter')
    if (pets_allowed) features.push('Pets allowed')
    if (bills_included) features.push('Bills included')
    if (new_build) features.push('New build')
    if (shared_ownership) features.push('Shared ownership')

    const letting_details: Record<string, string> = {}
    if (deposit) letting_details['Deposit'] = '£' + parseInt(deposit).toLocaleString()
    if (available_from) letting_details['Available'] = available_from
    if (furnished) letting_details['Furnished'] = Array.isArray(furnished) ? furnished.join(', ') : furnished
    if (epc_rating) letting_details['EPC Rating'] = epc_rating
    if (council_tax_band) letting_details['Council Tax'] = 'Band ' + council_tax_band
    if (which_floor) letting_details['Floor'] = which_floor
    if (total_floors) letting_details['Building floors'] = total_floors
    if (floor_layout) letting_details['Layout'] = floor_layout

    const raw_data = {
      key_features: features,
      letting_details,
      contact: { name, email, phone, company_name, company_reg },
      floorplans: Array.isArray(floorplans) ? floorplans : [],
    }

    const { data, error } = await supabase.from('listings').insert({
      address,
      postcode: cleanedPostcode,
      latitude,
      longitude,
      borough: borough || cleanedPostcode.replace(/\s.*/, '').toUpperCase(),
      price: parseInt(price),
      bedrooms: parseInt(bedrooms),
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      property_type,
      description,
      images: JSON.stringify(images || []),
      square_feet: square_feet ? parseInt(square_feet) : null,
      listing_type: listing_type === 'buy' ? 'buy' : 'rent',
      agent_id: lister === 'agent' && user ? user.id : null,
      source: lister === 'private' ? 'Private owner' : lister === 'agent' ? 'Agent' : 'Landlord',
      source_url: null,
      is_active: false,
      is_direct: true,
      status: 'pending',
      listed_at: new Date().toISOString(),
      raw_data,
      furnished: Array.isArray(furnished) ? furnished.map((f: string) => f.toLowerCase()).join(', ') : furnished?.toLowerCase(),
    }).select('id').single()

    if (error) throw error

    // Notify admin of new submission
    if (process.env.ADMIN_EMAIL) {
      const notifyBody = `New listing submitted for review.

Address: ${address}
Contact: ${name} <${email}>
Type: ${listing_type}
Price: £${price}/mo

Review at: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/listings`
      console.log('[NEW LISTING SUBMITTED]', notifyBody)
      if (process.env.RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'NestLondon <hello@nestlondon.co.uk>', to: process.env.ADMIN_EMAIL, subject: `New listing pending review: ${address}`, text: notifyBody })
        })
      }
    }

    return NextResponse.json({ id: data.id, success: true })
  } catch (e: any) {
    console.error('Create listing error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
