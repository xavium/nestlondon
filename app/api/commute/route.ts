import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { normalizeCommuteLocations } from '@/lib/commute'

// Resolve a postcode or 'lat,lng' string to coordinates using postcodes.io (no API key)
async function resolveCoords(s: string): Promise<{ lat: number, lng: number } | null> {
  if (!s) return null
  const trimmed = s.trim()
  const m = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  try {
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed.replace(/\s+/g, ''))}`)
    if (r.ok) {
      const d = await r.json()
      if (d?.result?.latitude && d?.result?.longitude) return { lat: d.result.latitude, lng: d.result.longitude }
    }
  } catch {}
  return null
}

// Estimate journey duration from straight-line distance.
// Walking avg ~5 km/h, cycling ~16 km/h, with 1.3x detour factor.
async function estimateByDistance(from: string, to: string, mode: string) {
  const a = await resolveCoords(from)
  const b = await resolveCoords(to)
  if (!a || !b) return null
  const toRad = (d: number) => d * Math.PI / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  const km = 2 * R * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa))
  const adjusted = km * 1.3
  const speedKph = mode === 'bike' ? 16 : 5
  const minutes = Math.round((adjusted / speedKph) * 60)
  return {
    duration: minutes,
    legs: [{ mode, duration: minutes, summary: `${mode === 'bike' ? 'Cycle' : 'Walk'} ~${adjusted.toFixed(1)}km` }],
    modes: [mode],
    fare: null,
    estimated: true,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') // postcode or lat,lng
    const to = searchParams.get('to')     // user's work address
    const mode = (searchParams.get('mode') || 'public').toLowerCase()

    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

    const TFL_MODE_MAP: Record<string, string> = {
      public: 'tube,bus,walking,overground,national-rail,dlr',
      walk: 'walking',
      bike: 'cycle',
    }
    const tflMode = TFL_MODE_MAP[mode] || TFL_MODE_MAP.public

    // Compute one journey for a single destination. Pulled out so we can map it
    // across multiple destinations when `to` is comma-separated.
    async function computeOne(dest: string) {
      const encodedFrom = encodeURIComponent(from!)
      const encodedTo = encodeURIComponent(dest)
      const tflUrl = `https://api.tfl.gov.uk/Journey/JourneyResults/${encodedFrom}/to/${encodedTo}?mode=${tflMode}`
      const r = await fetch(tflUrl, { next: { revalidate: 3600 } })
      if (!r.ok) {
        if (mode === 'walk' || mode === 'bike') {
          const fb = await estimateByDistance(from!, dest, mode)
          if (fb) return fb
        }
        return { duration: null, legs: [], modes: [], fare: null, error: 'TfL API error' as const }
      }
      const data = await r.json()
      const journeys = data.journeys || []
      if (!journeys.length) {
        if (mode === 'walk' || mode === 'bike') {
          const fb = await estimateByDistance(from!, dest, mode)
          if (fb) return fb
        }
        return { duration: null, legs: [], modes: [], fare: null }
      }
      const fastest = journeys.reduce((a: any, b: any) => a.duration < b.duration ? a : b)
      const legs = fastest.legs.map((leg: any) => ({
        mode: leg.mode?.name || 'walk',
        duration: leg.duration,
        summary: leg.instruction?.summary || '',
      }))
      const modes = [...new Set(legs.map((l: any) => l.mode).filter((m: string) => m !== 'walking'))]
      return {
        duration: fastest.duration,
        legs,
        modes,
        fare: fastest.fare?.totalCost ? Math.round(fastest.fare.totalCost / 100) : null,
      }
    }

    // Multi-destination: comma-separated `to=`. Returns { results: [...] } parallel to input order.
    const destinations = to.split(',').map(s => s.trim()).filter(Boolean)
    if (destinations.length > 1) {
      const results = await Promise.all(destinations.map(computeOne))
      return NextResponse.json({ results })
    }

    // Single destination: legacy shape (flat object) so existing callers don't break.
    const single = await computeOne(destinations[0] || to)
    if ((single as any).error === 'TfL API error') {
      return NextResponse.json({ error: 'TfL API error' }, { status: 502 })
    }
    return NextResponse.json(single)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — save commute address to user profile
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const commute_address = body.commute_address
    const commute_mode = body.commute_mode // optional 'public' | 'walk' | 'bike'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const patch: Record<string, any> = { ...user.user_metadata }
    if (typeof commute_address !== 'undefined') patch.commute_address = commute_address
    if (typeof commute_mode !== 'undefined') patch.commute_mode = commute_mode
    if (typeof body.commute_locations !== 'undefined') {
      patch.commute_locations = normalizeCommuteLocations(body.commute_locations)
    }

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: patch,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
