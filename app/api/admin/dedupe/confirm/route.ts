import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/dedupe/confirm
 * Body: { canonical_id, duplicate_id }
 *
 * Records admin approval of an auto-hide. State doesn't change (listing remains
 * hidden), just adds a 'confirm' log row so the pair never reappears for review.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.canonical_id || !body?.duplicate_id) return NextResponse.json({ error: 'canonical_id and duplicate_id required' }, { status: 400 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await svc.from('listing_merge_log').insert({
    action: 'confirm',
    canonical_listing_id: body.canonical_id,
    merged_listing_id: body.duplicate_id,
    performed_by: user?.id ?? null,
    notes: 'Admin confirmed auto-merge',
  })

  return NextResponse.json({ ok: true })
}
