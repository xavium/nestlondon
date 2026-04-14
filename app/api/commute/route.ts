import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') // postcode or lat,lng
    const to = searchParams.get('to')     // user's work address

    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

    const encodedFrom = encodeURIComponent(from)
    const encodedTo = encodeURIComponent(to)
    const tflUrl = `https://api.tfl.gov.uk/Journey/JourneyResults/${encodedFrom}/to/${encodedTo}?mode=tube,bus,walking`

    const res = await fetch(tflUrl, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json({ error: 'TfL API error' }, { status: 502 })

    const data = await res.json()
    const journeys = data.journeys || []

    if (!journeys.length) return NextResponse.json({ duration: null, legs: [] })

    // Take fastest journey
    const fastest = journeys.reduce((a: any, b: any) => a.duration < b.duration ? a : b)

    const legs = fastest.legs.map((leg: any) => ({
      mode: leg.mode?.name || 'walk',
      duration: leg.duration,
      summary: leg.instruction?.summary || '',
    }))

    const modes = [...new Set(legs.map((l: any) => l.mode).filter((m: string) => m !== 'walking'))]

    return NextResponse.json({
      duration: fastest.duration,
      legs,
      modes,
      fare: fastest.fare?.totalCost ? Math.round(fastest.fare.totalCost / 100) : null,
    })
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

    const { commute_address } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, commute_address }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
