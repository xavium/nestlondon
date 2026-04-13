import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ saved: false })

    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: searches } = await supabase
      .from('saved_searches')
      .select('id, params')
      .eq('user_id', user.id)

    // Compare params — check if any saved search has same key/value pairs
    const normalize = (p: Record<string, string>) =>
      JSON.stringify(Object.keys(p).sort().reduce((a, k) => ({ ...a, [k]: p[k] }), {}))

    const currentKey = normalize(params)
    const isSaved = (searches || []).some(s => normalize(s.params as Record<string, string>) === currentKey)

    return NextResponse.json({ saved: isSaved })
  } catch {
    return NextResponse.json({ saved: false })
  }
}
