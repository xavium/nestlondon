import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const POSTCODE_COORDS: Record<string, [number, number]> = {
  'EC1': [51.5223,-0.0988],'EC2': [51.5178,-0.0823],'WC1': [51.5228,-0.1212],'WC2': [51.5121,-0.1228],
  'E1': [51.5154,-0.0708],'E2': [51.5277,-0.0549],'E8': [51.5415,-0.0594],'E14': [51.5051,-0.0209],
  'N1': [51.5362,-0.1033],'N16': [51.5635,-0.0740],
  'NW1': [51.5308,-0.1238],'NW3': [51.5503,-0.1643],'NW6': [51.5466,-0.2041],
  'SE1': [51.5044,-0.1052],'SE5': [51.4697,-0.0694],'SW4': [51.4618,-0.1386],
  'SW6': [51.4753,-0.2010],'SW9': [51.4723,-0.1228],'SW11': [51.4647,-0.1607],
  'W1': [51.5152,-0.1415],'W2': [51.5154,-0.1755],'W11': [51.5094,-0.1967],
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
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

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ count: 0 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: searches } = await supabase
      .from('saved_searches')
      .select('id, params, last_checked_at, created_at')
      .eq('user_id', user.id)

    if (!searches?.length) return NextResponse.json({ count: 0 })

    let total = 0
    for (const s of searches) {
      const since = s.last_checked_at || s.created_at
      const params = s.params as Record<string, string>
      let q = supabase
        .from('listings')
        .select('id, bedrooms, price, latitude, longitude')
        .eq('is_active', true)
        .is('canonical_listing_id', null)
        .gte('scraped_at', since)
        .limit(200)
      if (params.minBeds) q = q.gte('bedrooms', parseInt(params.minBeds))
      if (params.maxBeds) q = q.lte('bedrooms', parseInt(params.maxBeds))
      if (params.minPrice) q = q.gte('price', parseInt(params.minPrice))
      if (params.maxPrice) q = q.lte('price', parseInt(params.maxPrice))
      const { data: candidates } = await q
      total += (candidates || []).filter(l => matchesSearch(l, params)).length
    }

    return NextResponse.json({ count: total })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
