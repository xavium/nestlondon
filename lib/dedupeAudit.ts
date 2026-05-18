/**
 * Audit logic for cross-source duplicate detection. Pure function — no I/O.
 *
 * Takes a list of listings, applies fingerprint blocking + pairwise scoring,
 * returns sorted suggestions in two buckets: confident duplicates and items to review.
 *
 * Reusable from:
 *   - scripts/find_potential_duplicates.mjs (CLI)
 *   - app/admin/dedupe/page.tsx (admin UI)
 */
import { fingerprint, pairScore, type ListingForDedupe, type PairScoreResult } from './listingFingerprint'

export const CONFIDENT_THRESHOLD = 0.80
export const REVIEW_THRESHOLD = 0.60

export interface DupeSuggestion {
  a: ListingForDedupe
  b: ListingForDedupe
  score: number
  breakdown: PairScoreResult['breakdown']
}

export interface AuditResult {
  totalListings: number
  totalBlocks: number
  multiBlockCount: number
  totalComparisons: number
  confident: DupeSuggestion[]
  review: DupeSuggestion[]
}

export function runAudit(listings: ListingForDedupe[]): AuditResult {
  // Block by fingerprint
  const blocks = new Map<string, ListingForDedupe[]>()
  for (const l of listings) {
    const fp = fingerprint(l)
    if (!blocks.has(fp)) blocks.set(fp, [])
    blocks.get(fp)!.push(l)
  }

  const multiBlocks = Array.from(blocks.entries()).filter(([_, ls]) => ls.length > 1)

  const confident: DupeSuggestion[] = []
  const review: DupeSuggestion[] = []
  let totalComparisons = 0

  for (const [, group] of multiBlocks) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalComparisons++
        const result = pairScore(group[i], group[j])
        if (result.score >= CONFIDENT_THRESHOLD) {
          confident.push({ a: group[i], b: group[j], score: result.score, breakdown: result.breakdown })
        } else if (result.score >= REVIEW_THRESHOLD) {
          review.push({ a: group[i], b: group[j], score: result.score, breakdown: result.breakdown })
        }
      }
    }
  }

  confident.sort((x, y) => y.score - x.score)
  review.sort((x, y) => y.score - x.score)

  return {
    totalListings: listings.length,
    totalBlocks: blocks.size,
    multiBlockCount: multiBlocks.length,
    totalComparisons,
    confident,
    review,
  }
}
