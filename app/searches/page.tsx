import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import SavedSearchesClient from './SavedSearchesClient'

const POSTCODE_COORDS: Record<string, [number, number]> = {
  'EC1': [51.5223,-0.0988],'EC2': [51.5178,-0.0823],'WC1': [51.5228,-0.1212],'WC2': [51.5121,-0.1228],
  'E1': [51.5154,-0.0708],'E2': [51.5277,-0.0549],'E8': [51.5415,-0.0594],'E14': [51.5051,-0.0209],
  'N1': [51.5362,-0.1033],'N16': [51.5635,-0.0740],
  'NW1': [51.5308,-0.1238],'NW3': [51.5503,-0.1643],'NW6': [51.5466,-0.2041],
  'SE1': [51.5044,-0.1052],'SE5': [51.4697,-0.0694],'SE15': [51.4697,-0.0694],'SE22': [51.4571,-0.0533],
  'SW4': [51.4618,-0.1386],'SW6': [51.4753,-0.2010],'SW9': [51.4723,-0.1228],'SW11': [51.4647,-0.1607],
  'W1': [51.5152,-0.1415],'W2': [51.5154,-0.1755],'W11': [51.5094,-0.1967],
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2-lat1)*Math.PI/180
  const dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

function matchesSearch(listing: any, params: Record<string,string>): boolean {
  if (params.minBeds && listing.bedrooms !== null && listing.bedrooms < parseInt(params.minBeds)) return false
  if (params.maxBeds && listing.bedrooms !== null && listing.bedrooms > parseInt(params.maxBeds)) return false
  if (params.minPrice && listing.price < parseInt(params.minPrice)) return false
  if (params.maxPrice && listing.price > parseInt(params.maxPrice)) return false
  if (params.location && listing.latitude && listing.longitude) {
    const coords = POSTCODE_COORDS[params.location.trim().toUpperCase()]
    if (coords) {
      const dist = haversineM(coords[0], coords[1], listing.latitude, listing.longitude)
      if (dist > (params.radius ? parseFloat(params.radius) : 1) * 1609.34) return false
    }
  }
  return true
}

export default async function SearchesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/searches')

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: savedSearches } = await serviceClient
    .from('saved_searches')
    .select('id, name, params, created_at, alerts_enabled, alert_frequency, last_checked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // For each saved search, count new matches since last_checked_at
  const searchesWithCounts = await Promise.all((savedSearches || []).map(async s => {
    const since = s.last_checked_at || s.created_at
    let query = serviceClient
      .from('listings')
      .select('id, bedrooms, price, latitude, longitude, scraped_at')
      .eq('is_active', true)
      .is('canonical_listing_id', null)
      .gte('scraped_at', since)
      .limit(200)

    const params = s.params as Record<string, string>
    if (params.minBeds) query = query.gte('bedrooms', parseInt(params.minBeds))
    if (params.maxBeds) query = query.lte('bedrooms', parseInt(params.maxBeds))
    if (params.minPrice) query = query.gte('price', parseInt(params.minPrice))
    if (params.maxPrice) query = query.lte('price', parseInt(params.maxPrice))

    const { data: candidates } = await query
    const newCount = (candidates || []).filter(l => matchesSearch(l, params)).length

    return {
      ...s,
      new_matches: newCount,
      alerts_enabled: s.alerts_enabled ?? false,
      alert_frequency: (s.alert_frequency || 'instant') as 'instant' | 'daily' | 'weekly' | 'none',
    }
  }))

  // Mark all as checked now
  const now = new Date().toISOString()
  await serviceClient
    .from('saved_searches')
    .update({ last_checked_at: now })
    .eq('user_id', user.id)

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        
        <NavAuthButton variant="dark" />
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>My searches</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Saved searches</h1>
        </div>
        <SavedSearchesClient savedSearches={searchesWithCounts as any} />
      </div>
    </main>
  )
}
