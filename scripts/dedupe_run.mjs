/**
 * Dedupe runner. Run after each scrape batch to auto-hide newly-detected duplicates.
 *
 *   node --env-file=.env.local scripts/dedupe_run.mjs
 *
 * Loads all active, non-merged listings, scores pairs, and auto-hides confident
 * duplicates per the same rules as /admin/dedupe. Idempotent — won't re-process
 * pairs that already have a merge_log decision.
 *
 * Exit codes:
 *   0 — success (whether or not anything was hidden)
 *   1 — DB error or unexpected failure
 */
import { createClient } from '@supabase/supabase-js'
import { fingerprint, pairScore } from '../lib/listingFingerprint.ts'
import { recommendCanonical } from '../lib/dedupeAudit.ts'

const CONFIDENT_THRESHOLD = 0.80

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('[dedupe] Loading active, non-merged listings...')
const { data: listings, error } = await supabase
  .from('listings')
  .select('id, address, postcode, latitude, longitude, bedrooms, bathrooms, property_type, price, listing_type, raw_data, source, source_url, scraped_at, listed_at, is_active, is_direct, agent_id')
  .is('canonical_listing_id', null)
  .eq('is_active', true)

if (error) {
  console.error('[dedupe] DB error:', error.message)
  process.exit(1)
}

console.log(`[dedupe] Loaded ${listings.length} listings`)

// Block by fingerprint
const blocks = new Map()
for (const l of listings) {
  const fp = fingerprint(l)
  if (!blocks.has(fp)) blocks.set(fp, [])
  blocks.get(fp).push(l)
}

// Find confident pairs
const confidentPairs = []
let comparisons = 0
for (const group of blocks.values()) {
  if (group.length < 2) continue
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      comparisons++
      const result = pairScore(group[i], group[j])
      if (result.score >= CONFIDENT_THRESHOLD) {
        const recommendation = recommendCanonical(group[i], group[j])
        confidentPairs.push({ a: group[i], b: group[j], score: result.score, recommendation })
      }
    }
  }
}

console.log(`[dedupe] Compared ${comparisons} pairs; ${confidentPairs.length} confident matches`)

if (confidentPairs.length === 0) {
  console.log('[dedupe] Nothing to auto-hide. Done.')
  process.exit(0)
}

// Skip pairs already decided (idempotency)
const allIds = new Set()
for (const p of confidentPairs) { allIds.add(p.a.id); allIds.add(p.b.id) }
const idList = Array.from(allIds).join(',')
const { data: logRows } = await supabase
  .from('listing_merge_log')
  .select('action, canonical_listing_id, merged_listing_id')
  .or(`canonical_listing_id.in.(${idList}),merged_listing_id.in.(${idList})`)

const decided = new Set()
for (const r of logRows || []) {
  decided.add(`${r.canonical_listing_id}|${r.merged_listing_id}`)
  decided.add(`${r.merged_listing_id}|${r.canonical_listing_id}`)
}

let hidden = 0
let skippedAmbiguous = 0
let skippedDecided = 0

for (const pair of confidentPairs) {
  const key = `${pair.a.id}|${pair.b.id}`
  if (decided.has(key)) { skippedDecided++; continue }
  if (pair.recommendation.canonical === null) { skippedAmbiguous++; continue }

  const canonicalId = pair.recommendation.canonical === 'a' ? pair.a.id : pair.b.id
  const duplicateId = pair.recommendation.canonical === 'a' ? pair.b.id : pair.a.id
  const dup = pair.recommendation.canonical === 'a' ? pair.b : pair.a

  // Set canonical on duplicate
  const { error: updErr } = await supabase
    .from('listings')
    .update({ canonical_listing_id: canonicalId })
    .eq('id', duplicateId)
    .is('canonical_listing_id', null)
  if (updErr) {
    console.error(`[dedupe] update error for ${duplicateId}:`, updErr.message)
    continue
  }

  // Copy duplicate's source into listing_sources
  if (dup.source && dup.source_url) {
    await supabase
      .from('listing_sources')
      .upsert(
        { listing_id: canonicalId, source: dup.source, source_url: dup.source_url },
        { onConflict: 'listing_id,source,source_url', ignoreDuplicates: true }
      )
  }

  // Log
  await supabase.from('listing_merge_log').insert({
    action: 'auto_merge',
    canonical_listing_id: canonicalId,
    merged_listing_id: duplicateId,
    score: pair.score,
    performed_by: null,    // scraper-triggered, no user
    notes: `Auto-hidden by scraper-time dedupe: ${pair.recommendation.reason}`,
  })

  hidden++
  console.log(`[dedupe]   hidden ${duplicateId.slice(0,8)} → ${canonicalId.slice(0,8)} (score ${pair.score.toFixed(3)})`)
}

console.log(`[dedupe] Done. Hidden: ${hidden}, ambiguous (left visible): ${skippedAmbiguous}, already-decided: ${skippedDecided}`)
process.exit(0)
