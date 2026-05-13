import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { migrateLegacyCommute } from '@/lib/commute'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ commute_address: null, commute_mode: null, commute_locations: [] })
    const meta = user.user_metadata || {}
    // Return legacy fields for back-compat AND the new locations array.
    // migrateLegacyCommute folds a singular commute_address into a location if no array exists.
    const locations = migrateLegacyCommute(meta.commute_locations, meta.commute_address, meta.commute_mode)
    return NextResponse.json({
      commute_address: meta.commute_address || null,
      commute_mode: meta.commute_mode || null,
      commute_locations: locations,
    })
  } catch {
    return NextResponse.json({ commute_address: null, commute_mode: null, commute_locations: [] })
  }
}
