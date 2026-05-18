/**
 * Auto-hide logic for confident duplicate detection.
 *
 * When the audit finds a confident pair AND has a non-null recommendation
 * (i.e. one side is clearly canonical per our rule), we automatically hide the
 * duplicate from public view by setting its canonical_listing_id. The admin
 * later confirms or rejects via the admin UI.
 *
 * Idempotency: we never re-auto-hide a pair that already has a merge_log entry.
 * Possible existing entries: auto_merge (already hidden), merge (admin-merged),
 * confirm (admin confirmed an auto-hide), reject (admin said no — leave alone).
 *
 * Logging: each auto-hide writes an 'auto_merge' row to listing_merge_log.
 * Admin actions later write 'confirm' or 'reject' rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DupeSuggestion } from './dedupeAudit'

type PairKey = string  // canonical_id|merged_id, both directions tried during lookup

function key(canonicalId: string, dupId: string): PairKey {
  return `${canonicalId}|${dupId}`
}

/**
 * Load all merge_log entries for the candidate pairs and return a set of
 * "already decided" pair keys (in both directions, so we don't auto-merge a
 * pair where A→B was decided but the audit now sees it as B→A).
 */
async function loadDecidedPairs(
  svc: SupabaseClient,
  pairs: { aId: string; bId: string }[],
): Promise<Set<PairKey>> {
  if (pairs.length === 0) return new Set()
  const ids = new Set<string>()
  for (const p of pairs) { ids.add(p.aId); ids.add(p.bId) }

  // Pull every merge_log row touching any of these listings
  const { data, error } = await svc
    .from('listing_merge_log')
    .select('action, canonical_listing_id, merged_listing_id')
    .or(`canonical_listing_id.in.(${Array.from(ids).join(',')}),merged_listing_id.in.(${Array.from(ids).join(',')})`)
  if (error) {
    console.error('[auto-hide] merge_log read error:', error.message)
    return new Set()
  }

  const decided = new Set<PairKey>()
  for (const row of data || []) {
    // Any decision on this pair counts (in either direction)
    decided.add(key(row.canonical_listing_id, row.merged_listing_id))
    decided.add(key(row.merged_listing_id, row.canonical_listing_id))
  }
  return decided
}

/**
 * Auto-hide the duplicates in any confident suggestions that haven't been
 * decided yet. Returns the count of newly-hidden pairs.
 */
export async function autoHideUndecided(
  svc: SupabaseClient,
  suggestions: DupeSuggestion[],
  performedBy: string | null = null,
): Promise<number> {
  // Filter to actionable suggestions: confident threshold + non-null recommendation
  const actionable = suggestions.filter(s => s.recommendation.canonical !== null)
  if (actionable.length === 0) return 0

  const pairs = actionable.map(s => ({ aId: s.a.id, bId: s.b.id }))
  const decided = await loadDecidedPairs(svc, pairs)

  let count = 0
  for (const s of actionable) {
    if (decided.has(key(s.a.id, s.b.id))) continue
    if (s.recommendation.canonical === null) continue

    const canonicalId = s.recommendation.canonical === 'a' ? s.a.id : s.b.id
    const duplicateId = s.recommendation.canonical === 'a' ? s.b.id : s.a.id
    const dup = s.recommendation.canonical === 'a' ? s.b : s.a

    // Set canonical_listing_id on the duplicate
    const { error: updErr } = await svc
      .from('listings')
      .update({ canonical_listing_id: canonicalId })
      .eq('id', duplicateId)
      .is('canonical_listing_id', null)   // safety: only if currently null
    if (updErr) {
      console.error('[auto-hide] update error:', updErr.message)
      continue
    }

    // Also push duplicate's source into listing_sources
    const dupAny = dup as any
    if (dupAny.source && dupAny.source_url) {
      await svc
        .from('listing_sources')
        .upsert(
          { listing_id: canonicalId, source: dupAny.source, source_url: dupAny.source_url },
          { onConflict: 'listing_id,source,source_url', ignoreDuplicates: true }
        )
    }

    // Log
    await svc.from('listing_merge_log').insert({
      action: 'auto_merge',
      canonical_listing_id: canonicalId,
      merged_listing_id: duplicateId,
      score: s.score,
      performed_by: performedBy,
      notes: `Auto-hidden by detector: ${s.recommendation.reason}`,
    })
    count++
  }
  return count
}
