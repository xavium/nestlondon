import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Status transitions on edit:
//   live          → pending (off-site while admin re-reviews)
//   deactivated   → pending (re-review on resubmission)
//   pending       → pending  (already in queue, just refresh content)
//   paused        → paused   (user has to manually resubmit)
function nextStatusOnEdit(current: string | null, resubmit: boolean): { status: string, is_active: boolean } {
  if (current === 'live' || current === 'deactivated') return { status: 'pending', is_active: false }
  // Paused listings stay paused unless the user explicitly asks to resubmit
  if (current === 'paused') return { status: resubmit ? 'pending' : 'paused', is_active: false }
  return { status: 'pending', is_active: false }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const body = await req.json()

    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: listing } = await svc.from('listings').select('agent_id, raw_data, source, status, is_direct').eq('id', id).single()
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!listing.is_direct) return NextResponse.json({ error: 'Cannot edit scraped listings' }, { status: 400 })

    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
    const isOwner = listing.agent_id === user.id || (rd?.contact?.email || '').toLowerCase() === (user.email || '').toLowerCase()
    if (!isOwner) return NextResponse.json({ error: 'Not authorised to edit this listing' }, { status: 403 })

    const {
      address, postcode, property_type, bedrooms, bathrooms, square_feet,
      which_floor, total_floors, floor_layout, epc_rating, council_tax_band,
      price, deposit, available_from, furnished, description, images, floorplans,
      has_garden, has_balcony, has_terrace, has_parking, has_garage,
      has_concierge, has_lift, has_porter, pets_allowed, bills_included,
      new_build, shared_ownership,
      name, email, phone, company_name, company_reg,
    } = body

    // Re-geocode if postcode changed
    let latitude: number | null = null
    let longitude: number | null = null
    let cleanedPostcode: string | null = postcode || null
    if (postcode) {
      cleanedPostcode = postcode.trim().toUpperCase().replace(/\s+/g, ' ')
      try {
        const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanedPostcode as string)}`)
        if (r.ok) {
          const d = await r.json()
          if (d?.result?.latitude && d?.result?.longitude) {
            latitude = d.result.latitude
            longitude = d.result.longitude
          }
        }
      } catch {}
    }

    // Rebuild key_features array from booleans + handle furnished
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
    if (deposit) letting_details['Deposit'] = '£' + deposit
    if (available_from) letting_details['Available from'] = available_from
    if (epc_rating) letting_details['EPC Rating'] = epc_rating
    if (council_tax_band) letting_details['Council Tax'] = 'Band ' + council_tax_band
    if (which_floor) letting_details['Floor'] = which_floor
    if (total_floors) letting_details['Building floors'] = total_floors
    if (floor_layout) letting_details['Layout'] = floor_layout

    const newRawData = {
      ...rd,
      key_features: features,
      letting_details,
      contact: { name, email, phone, company_name, company_reg },
      floorplans: Array.isArray(floorplans) ? floorplans : (rd?.floorplans || []),
    }

    const transition = nextStatusOnEdit(listing.status as string | null, body?.resubmit === true)

    const update: Record<string, unknown> = {
      address,
      postcode: cleanedPostcode,
      property_type,
      bedrooms: bedrooms === '' || bedrooms == null ? null : Number(bedrooms),
      bathrooms: bathrooms === '' || bathrooms == null ? null : Number(bathrooms),
      square_feet: square_feet === '' || square_feet == null ? null : Number(square_feet),
      price: price === '' || price == null ? null : Number(price),
      description,
      images,
      raw_data: newRawData,
      furnished: Array.isArray(furnished) ? furnished.map((f: string) => f.toLowerCase()).join(', ') : furnished?.toLowerCase(),
      status: transition.status,
      is_active: transition.is_active,
    }
    if (latitude != null && longitude != null) {
      update.latitude = latitude
      update.longitude = longitude
    }

    const { error } = await svc.from('listings').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, status: transition.status })
  } catch (e: any) {
    console.error('[listings/edit] error:', e)
    return NextResponse.json({ error: e.message || 'Edit failed' }, { status: 500 })
  }
}
