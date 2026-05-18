import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/dedupe/merge
 * Body: { canonical_id, duplicate_id, score?, notes? }
 *
 * Effect:
 *   - duplicate.canonical_listing_id = canonical_id
 *   - duplicate.is_active = false
 *   - Insert (canonical.source, canonical.source_url) into listing_sources (idempotent)
 *   - Insert (duplicate.source, duplicate.source_url) into listing_sources
 *   - Log 'merge' action
 *
 * Refuses:
 *   - If canonical is already merged into something else (no chains)
 *   - If either listing doesn't exist
 *   - If they're the same id
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
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  const { canonical_id, duplicate_id, score, notes } = body
  if (!canonical_id || !duplicate_id) return NextResponse.json({ error: 'canonical_id and duplicate_id required' }, { status: 400 })
  if (canonical_id === duplicate_id) return NextResponse.json({ error: 'Cannot merge a listing into itself' }, { status: 400 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load both
  const { data: rows, error: loadErr } = await svc
    .from('listings')
    .select('id, source, source_url, canonical_listing_id, is_active')
    .in('id', [canonical_id, duplicate_id])

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  if (!rows || rows.length !== 2) return NextResponse.json({ error: 'One or both listings not found' }, { status: 404 })

  const canonical = rows.find(r => r.id === canonical_id)
  const duplicate = rows.find(r => r.id === duplicate_id)
  if (!canonical || !duplicate) return NextResponse.json({ error: 'Listings not loaded correctly' }, { status: 500 })

  // Refuse chains: canonical must not itself be merged
  if (canonical.canonical_listing_id) {
    return NextResponse.json({ error: 'The canonical listing is already merged into another. Merge into that one instead.' }, { status: 409 })
  }
  // Refuse re-merge: duplicate must not already be merged
  if (duplicate.canonical_listing_id) {
    return NextResponse.json({ error: 'The duplicate is already merged. Unmerge it first if you want to merge it elsewhere.' }, { status: 409 })
  }

  // Insert canonical's own source if not already present (first-time merge per canonical)
  // This way the canonical has its own source in listing_sources alongside the merged-in ones.
  if (canonical.source && canonical.source_url) {
    const { error: srcErr } = await svc
      .from('listing_sources')
      .upsert(
        { listing_id: canonical_id, source: canonical.source, source_url: canonical.source_url },
        { onConflict: 'listing_id,source,source_url', ignoreDuplicates: true }
      )
    if (srcErr) console.error('[merge] canonical-source insert error:', srcErr.message)
  }

  // Insert duplicate's source
  if (duplicate.source && duplicate.source_url) {
    const { error: srcErr } = await svc
      .from('listing_sources')
      .upsert(
        { listing_id: canonical_id, source: duplicate.source, source_url: duplicate.source_url },
        { onConflict: 'listing_id,source,source_url', ignoreDuplicates: true }
      )
    if (srcErr) console.error('[merge] duplicate-source insert error:', srcErr.message)
  }

  // Point the duplicate at canonical + deactivate
  const { error: updErr } = await svc
    .from('listings')
    .update({ canonical_listing_id: canonical_id, is_active: false })
    .eq('id', duplicate_id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Log
  const { error: logErr } = await svc
    .from('listing_merge_log')
    .insert({
      action: 'merge',
      canonical_listing_id: canonical_id,
      merged_listing_id: duplicate_id,
      score: score ?? null,
      performed_by: user?.id ?? null,
      notes: notes ?? null,
    })
  if (logErr) console.error('[merge] log error:', logErr.message)

  return NextResponse.json({ ok: true })
}
