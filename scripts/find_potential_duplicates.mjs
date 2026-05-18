import { createClient } from '@supabase/supabase-js'
import { fingerprint, pairScore } from '../lib/listingFingerprint.ts'

// Run with:
//   node --env-file=.env.local --experimental-strip-types scripts/find_potential_duplicates.mjs
//
// Node 22+ supports --experimental-strip-types so we can import the .ts file directly.
// (Reports may be noisy on first run — that's expected. Tune by reading the output.)

const REVIEW_THRESHOLD = 0.60
const CONFIDENT_THRESHOLD = 0.80

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('Loading active listings...')
const { data, error } = await supabase
  .from('listings')
  .select('id, address, postcode, latitude, longitude, bedrooms, bathrooms, property_type, price, listing_type, raw_data, source')
  .eq('is_active', true)

if (error) { console.error(error); process.exit(1) }

const listings = data || []
console.log(`Loaded ${listings.length} listings`)

// Block by fingerprint
const blocks = new Map()
for (const l of listings) {
  const fp = fingerprint(l)
  if (!blocks.has(fp)) blocks.set(fp, [])
  blocks.get(fp).push(l)
}

console.log(`Created ${blocks.size} fingerprint blocks`)
const multiBlocks = Array.from(blocks.entries()).filter(([_, ls]) => ls.length > 1)
console.log(`${multiBlocks.length} blocks have 2+ listings (eligible for comparison)`)

// Pairwise within each multi-block
const confident = []
const review = []
let totalComparisons = 0

for (const [_fp, group] of multiBlocks) {
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

console.log(`Compared ${totalComparisons} pairs.`)
console.log()
console.log('=================================================================')
console.log(`CONFIDENT DUPLICATES (score >= ${CONFIDENT_THRESHOLD}): ${confident.length}`)
console.log('=================================================================')
for (const s of confident.sort((x, y) => y.score - x.score)) {
  console.log()
  console.log(`SCORE: ${s.score.toFixed(3)}  |  addr=${s.breakdown.address.toFixed(2)} price=${s.breakdown.price.toFixed(2)} bed=${s.breakdown.bedrooms.toFixed(2)} size=${s.breakdown.size.toFixed(2)} geo=${s.breakdown.geo == null ? '-' : s.breakdown.geo.toFixed(2)}`)
  console.log(`  A: ${s.a.id.slice(0,8)} [${s.a.source}] £${s.a.price?.toLocaleString()} ${s.a.bedrooms}b ${s.a.address}`)
  console.log(`  B: ${s.b.id.slice(0,8)} [${s.b.source}] £${s.b.price?.toLocaleString()} ${s.b.bedrooms}b ${s.b.address}`)
}

console.log()
console.log('=================================================================')
console.log(`NEEDS REVIEW (${REVIEW_THRESHOLD} <= score < ${CONFIDENT_THRESHOLD}): ${review.length}`)
console.log('=================================================================')
for (const s of review.sort((x, y) => y.score - x.score).slice(0, 30)) {
  console.log()
  console.log(`SCORE: ${s.score.toFixed(3)}  |  addr=${s.breakdown.address.toFixed(2)} price=${s.breakdown.price.toFixed(2)} bed=${s.breakdown.bedrooms.toFixed(2)} size=${s.breakdown.size.toFixed(2)} geo=${s.breakdown.geo == null ? '-' : s.breakdown.geo.toFixed(2)}`)
  console.log(`  A: ${s.a.id.slice(0,8)} [${s.a.source}] £${s.a.price?.toLocaleString()} ${s.a.bedrooms}b ${s.a.address}`)
  console.log(`  B: ${s.b.id.slice(0,8)} [${s.b.source}] £${s.b.price?.toLocaleString()} ${s.b.bedrooms}b ${s.b.address}`)
}
if (review.length > 30) console.log(`\n... and ${review.length - 30} more review suggestions (truncated)`)
