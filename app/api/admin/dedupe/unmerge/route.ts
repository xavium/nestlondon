import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/admin/dedupe/unmerge
 * Body: { merge_log_id }
 *
 * Reverses a merge. Effects:
 *   - duplicate.canonical_listing_id = null
 *   - duplicate.is_active = true
 *   - Remove duplicate's source from canonical's listing_sources
 *   - Log 'unmerge' action
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
  if (!body?.merge_log_id) return NextResponse.json({ error: 'merge_log_id required' }, { status: 400 })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load the original merge action
  const { data: logRow, error: logErr } = await svc
    .from('listing_merge_log')
    .select('*')
    .eq('id', body.merge_log_id)
    .eq('action', 'merge')
    .maybeSingle()
  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 })
  if (!logRow) return NextResponse.json({ error: 'Merge log entry not found or already unmerged' }, { status: 404 })

  const { canonical_listing_id, merged_listing_id } = logRow

  // Load the duplicate's source so we can remove its row from listing_sources
  const { data: dup } = await svc
    .from('listings')
    .select('id, source, source_url, canonical_listing_id')
    .eq('id', merged_listing_id)
    .maybeSingle()

  if (!dup || dup.canonical_listing_id !== canonical_listing_id) {
    return NextResponse.json({ error: 'Duplicate is no longer merged into this canonical; cannot unmerge.' }, { status: 409 })
  }

  // Restore the duplicate
  const { error: updErr } = await svc
    .from('listings')
    .update({ canonical_listing_id: null, is_active: true })
    .eq('id', merged_listing_id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Remove the duplicate's source row from canonical
  if (dup.source && dup.source_url) {
    await svc
      .from('listing_sources')
      .delete()
      .eq('listing_id', canonical_listing_id)
      .eq('source', dup.source)
      .eq('source_url', dup.source_url)
  }

  // Mark the original log row as superseded by inserting an unmerge log entry.
  // We keep the merge log row intact for audit; the unmerge log row references the same listings.
  await svc
    .from('listing_merge_log')
    .insert({
      action: 'unmerge',
      canonical_listing_id,
      merged_listing_id,
      performed_by: user?.id ?? null,
      notes: `Reverses merge log row ${body.merge_log_id}`,
    })

  return NextResponse.json({ ok: true })
}
