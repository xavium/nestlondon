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

/**
 * Recommendation for which side should be canonical, applied per the rule:
 *   1. Direct listing wins over scraped
 *   2. If neither or both are direct: most recent scraped_at wins
 *   3. If both are direct: needs human review (canonical = null)
 */
export type Side = 'a' | 'b' | null

export interface Recommendation {
  canonical: Side          // null = needs admin review
  reason: string
}

export function recommendCanonical(a: any, b: any): Recommendation {
  const aDirect = !!a.is_direct
  const bDirect = !!b.is_direct

  // Direct trumps scraped
  if (aDirect && !bDirect) return { canonical: 'a', reason: 'A is a direct listing; B is scraped' }
  if (bDirect && !aDirect) return { canonical: 'b', reason: 'B is a direct listing; A is scraped' }

  // Both direct — ambiguous, escalate
  if (aDirect && bDirect) return { canonical: null, reason: 'Both are direct listings — needs admin review' }

  // Neither direct — pick most recently scraped (freshest data wins)
  const aTime = a.scraped_at ? new Date(a.scraped_at).getTime() : 0
  const bTime = b.scraped_at ? new Date(b.scraped_at).getTime() : 0
  if (aTime === bTime) return { canonical: 'a', reason: 'Both scraped at the same time; keeping A by default' }
  if (aTime > bTime) return { canonical: 'a', reason: 'A has more recent data' }
  return { canonical: 'b', reason: 'B has more recent data' }
}

export interface DupeSuggestion {
  a: ListingForDedupe
  b: ListingForDedupe
  score: number
  breakdown: PairScoreResult['breakdown']
  recommendation: Recommendation
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
        const recommendation = recommendCanonical(group[i], group[j])
        const suggestion = { a: group[i], b: group[j], score: result.score, breakdown: result.breakdown, recommendation }
        if (result.score >= CONFIDENT_THRESHOLD) {
          confident.push(suggestion)
        } else if (result.score >= REVIEW_THRESHOLD) {
          review.push(suggestion)
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
