import { createServerClient } from '@supabase/ssr'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OwnerDashboardClient from './OwnerDashboardClient'
import { valuate, type PropertySpec, type Comparable } from '@/lib/valuation'

export default async function OwnerDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/dashboard/owner')

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )

  const role = user.user_metadata?.role as string | undefined
  const specialismListingType = role?.endsWith('_sales') ? 'buy' : role?.endsWith('_lettings') ? 'rent' : null

  // Get user's listings via direct fetch (JS client doesn't support nested JSON path filters)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  const fields = 'id,address,price,bedrooms,bathrooms,property_type,borough,square_feet,is_active,status,listed_at,images,raw_data,listing_type'
  const emailEnc = encodeURIComponent(user.email!)
  console.log('Dashboard user email:', user.email, 'id:', user.id)

  const [r1, r2, r3] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/listings?select=${fields}&source=eq.Private%20owner&raw_data->contact->>email=eq.${emailEnc}&order=listed_at.desc`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }),
    fetch(`${supabaseUrl}/rest/v1/listings?select=${fields}&source=eq.Landlord&raw_data->contact->>email=eq.${emailEnc}&order=listed_at.desc`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }),
    fetch(`${supabaseUrl}/rest/v1/listings?select=${fields}&agent_id=eq.${user.id}&source=in.(Private%20owner,Landlord)&order=listed_at.desc`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }),
  ])
  const [l1, l2, l3] = await Promise.all([r1.json(), r2.json(), r3.json()])
  console.log('Listings found:', Array.isArray(l1) ? l1.length : 'err', Array.isArray(l2) ? l2.length : 'err', Array.isArray(l3) ? l3.length : 'err', 'l1:', JSON.stringify(l1).slice(0,100))
  const seen = new Set<string>()
  const allListings = [...(Array.isArray(l1) ? l1 : []), ...(Array.isArray(l2) ? l2 : []), ...(Array.isArray(l3) ? l3 : [])].filter(l => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    if (specialismListingType && l.listing_type && l.listing_type !== specialismListingType) return false
    return true
  })


  // Get events for all listings
  const ids = allListings.map(l => l.id)
  let events: any[] = []
  if (ids.length > 0) {
    const { data } = await adminClient
      .from('listing_events')
      .select('listing_id,event_type,created_at')
      .in('listing_id', ids)
    events = data || []
  }

  // Get comparable listings for pricing analysis
  const comparables: Record<string, any[]> = {}
  const avgDaysOnMarket: Record<string, number | null> = {}
  const valuations: Record<string, ReturnType<typeof valuate>> = {}
  for (const listing of allListings) {
    if (!listing.borough || !listing.price) continue
    const { data: comps } = await adminClient
      .from('listings')
      .select('id,price,bedrooms,square_feet,borough,listed_at,property_type,postcode,listing_type,epc_rating')
      .eq('is_active', true)
      .eq('borough', listing.borough)
      .not('id', 'eq', listing.id)
      .gte('bedrooms', Math.max(0, (listing.bedrooms || 1) - 1))
      .lte('bedrooms', (listing.bedrooms || 1) + 1)
      .limit(50)
    comparables[listing.id] = comps || []
    // Valuation (broader pool: refetch without the bedrooms filter for better coverage)
    try {
      const { data: broadPool } = await adminClient
        .from('listings')
        .select('id,listing_type,price,bedrooms,square_feet,property_type,borough,postcode,epc_rating')
        .eq('is_active', true)
        .eq('listing_type', listing.listing_type || 'rent')
        .or(`borough.eq.${listing.borough},postcode.ilike.${(listing.postcode||'').split(' ')[0]}%`)
        .not('id', 'eq', listing.id)
        .limit(200)
      const spec: PropertySpec = {
        listing_type: (listing.listing_type === 'buy' ? 'buy' : 'rent'),
        bedrooms: listing.bedrooms,
        square_feet: listing.square_feet,
        property_type: listing.property_type,
        borough: listing.borough,
        postcode: listing.postcode,
        epc_rating: (listing as any).epc_rating,
      }
      valuations[listing.id] = valuate(spec, (broadPool || []) as Comparable[])
    } catch { valuations[listing.id] = null }
    // Calculate avg days on market for similar listings
    const withDates = (comps || []).filter((c: any) => c.listed_at)
    if (withDates.length > 0) {
      const avgDays = Math.round(
        withDates.reduce((sum: number, c: any) => {
          return sum + Math.floor((Date.now() - new Date(c.listed_at).getTime()) / 86400000)
        }, 0) / withDates.length
      )
      avgDaysOnMarket[listing.id] = avgDays
    } else {
      avgDaysOnMarket[listing.id] = null
    }
  }

  // Get viewing requests for all listings — use REST API to bypass RLS
  let viewingRequests: any[] = []
  if (ids.length > 0) {
    const idList = ids.map((id: string) => id).join(',')
    const vrRes = await fetch(
      supabaseUrl + '/rest/v1/viewing_requests?listing_id=in.(' + idList + ')&order=created_at.desc',
      { headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey } }
    )
    const vrData = await vrRes.json()
    viewingRequests = Array.isArray(vrData) ? vrData : []
    console.log('[DASHBOARD] viewingRequests count:', viewingRequests.length, 'ids:', ids)
  }

  // Offers
  let offers: any[] = []
  if (ids.length > 0) {
    const idList = ids.map((id: string) => id).join(',')
    const ofRes = await fetch(
      supabaseUrl + '/rest/v1/offers?listing_id=in.(' + idList + ')&order=created_at.desc',
      { headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey } }
    )
    const ofData = await ofRes.json()
    offers = Array.isArray(ofData) ? ofData : []
  }

  // Fetch renter profiles for all tenants who made viewing requests
  let renterProfiles: Record<string, any> = {}
  if (viewingRequests.length > 0) {
    const tenantEmails = [...new Set(viewingRequests.map((r: any) => r.tenant_email).filter(Boolean))]
    console.log('[DASHBOARD] tenant emails:', tenantEmails)
    if (tenantEmails.length > 0) {
      const { data: rows, error: rpcError } = await adminClient.rpc('get_renter_profiles_by_email', { emails: tenantEmails })
      console.log('[DASHBOARD] renter profiles result:', rows, 'error:', rpcError)
      if (rows) {
        for (const row of rows) {
          renterProfiles[row.email] = row
        }
      }
    }
  }
  console.log('[DASHBOARD] renterProfiles keys:', Object.keys(renterProfiles))

  return (
    <OwnerDashboardClient
      user={{ email: user.email!, name: user.user_metadata?.name || user.user_metadata?.full_name }}
      listings={allListings}
      events={events}
      comparables={comparables}
        valuations={valuations}
      avgDaysOnMarket={avgDaysOnMarket}
      viewingRequests={viewingRequests}
      renterProfiles={renterProfiles}
      offers={offers}
    />
  )
}
