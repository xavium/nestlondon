import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/dedupe/reject
 * Body: { canonical_id, duplicate_id }
 *
 * Restores the duplicate (clears canonical_listing_id) and records the rejection
 * so the pair is permanently ignored in future audits.
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

  // Clear canonical_listing_id on the duplicate (restore visibility)
  await svc
    .from('listings')
    .update({ canonical_listing_id: null })
    .eq('id', body.duplicate_id)

  // Remove from listing_sources (clean up the auto-hide side effect)
  const { data: dup } = await svc
    .from('listings')
    .select('source, source_url')
    .eq('id', body.duplicate_id)
    .maybeSingle()
  if (dup?.source && dup?.source_url) {
    await svc
      .from('listing_sources')
      .delete()
      .eq('listing_id', body.canonical_id)
      .eq('source', dup.source)
      .eq('source_url', dup.source_url)
  }

  // Log rejection — used by future audits to skip this pair permanently
  await svc.from('listing_merge_log').insert({
    action: 'reject',
    canonical_listing_id: body.canonical_id,
    merged_listing_id: body.duplicate_id,
    performed_by: user?.id ?? null,
    notes: 'Admin rejected; pair will not auto-hide again',
  })

  return NextResponse.json({ ok: true })
}
