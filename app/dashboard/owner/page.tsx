import { createServerClient } from '@supabase/ssr'
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OwnerDashboardClient from './OwnerDashboardClient'

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

  // Get user's listings via direct fetch (JS client doesn't support nested JSON path filters)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  const fields = 'id,address,price,bedrooms,bathrooms,property_type,borough,square_feet,is_active,listed_at,images,raw_data'
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
  for (const listing of allListings) {
    if (!listing.borough || !listing.price) continue
    const { data: comps } = await adminClient
      .from('listings')
      .select('id,price,bedrooms,square_feet,borough,listed_at')
      .eq('is_active', true)
      .eq('borough', listing.borough)
      .not('id', 'eq', listing.id)
      .gte('bedrooms', Math.max(0, (listing.bedrooms || 1) - 1))
      .lte('bedrooms', (listing.bedrooms || 1) + 1)
      .limit(50)
    comparables[listing.id] = comps || []
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

  // Get viewing requests for all listings
  let viewingRequests: any[] = []
  if (ids.length > 0) {
    const { data: vr } = await adminClient
      .from('viewing_requests')
      .select('*')
      .in('listing_id', ids)
      .order('created_at', { ascending: false })
    viewingRequests = vr || []
  }

  return (
    <OwnerDashboardClient
      user={{ email: user.email!, name: user.user_metadata?.full_name }}
      listings={allListings}
      events={events}
      comparables={comparables}
      avgDaysOnMarket={avgDaysOnMarket}
      viewingRequests={viewingRequests}
    />
  )
}
