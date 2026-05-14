import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('listings')
  .select('id, address, description, raw_data')
  .eq('listing_type', 'buy')
  .eq('is_active', true)

if (error) { console.error(error); process.exit(1) }

let totalLeasehold = 0
let yearsExtracted = 0
let scExtracted = 0
let grExtracted = 0
const yearsBuckets = { '<80': 0, '80-99': 0, '100-249': 0, '250-799': 0, '800+': 0 }
const scSamples = []
const grSamples = []
const yearsSamples = []

// Patterns
const yearsPatterns = [
  /Lease\s+Years\s+Remaining[:\s]+(\d{2,4})/i,                // Foxtons structured
  /(\d{2,4})\s*[-\s]?year[s]?\s+leasehold/i,                  // "999-year leasehold"
  /(\d{2,4})\s+year[s]?\s+(?:lease|remaining|left|unexpired)/i,  // "144 year lease", "986 years remaining"
  /lease\s+(?:of\s+)?(\d{2,4})\s+years?/i,                    // "lease of 999 years"
]
const scPattern = /service\s+charge[:\s]*£\s*([\d,]+)/i
const grPattern = /ground\s+rent[:\s]*£\s*([\d,]+)/i

for (const l of data) {
  const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})
  const tenure = (rd.letting_details?.Tenure || '').toLowerCase()
  if (!tenure.includes('lease')) continue
  totalLeasehold++

  // Search Tenure field first (highest reliability), then description, then key_features
  const sources = [
    rd.letting_details?.Tenure || '',
    l.description || '',
    (rd.key_features || []).join(' '),
  ]
  const haystack = sources.join(' \n ')

  let years = null
  for (const p of yearsPatterns) {
    const m = haystack.match(p)
    if (m) { years = parseInt(m[1]); break }
  }
  if (years !== null && years >= 1 && years <= 999) {
    yearsExtracted++
    if (years < 80) yearsBuckets['<80']++
    else if (years < 100) yearsBuckets['80-99']++
    else if (years < 250) yearsBuckets['100-249']++
    else if (years < 800) yearsBuckets['250-799']++
    else yearsBuckets['800+']++
    if (yearsSamples.length < 8) yearsSamples.push({ id: l.id, address: l.address, years, src: sources.findIndex(s => yearsPatterns.some(p => p.test(s))) })
  }

  const sc = haystack.match(scPattern)
  if (sc) {
    scExtracted++
    if (scSamples.length < 5) scSamples.push({ id: l.id, address: l.address, sc: parseInt(sc[1].replace(/,/g, '')) })
  }
  const gr = haystack.match(grPattern)
  if (gr) {
    grExtracted++
    if (grSamples.length < 5) grSamples.push({ id: l.id, address: l.address, gr: parseInt(gr[1].replace(/,/g, '')) })
  }
}

console.log('---- ACROSS ALL ACTIVE BUY LISTINGS ----')
console.log('Total listings:', data.length)
console.log('Total leasehold:', totalLeasehold)
console.log('\nLease years extracted:', yearsExtracted, `(${Math.round(yearsExtracted/totalLeasehold*100)}% of leasehold)`)
console.log('  buckets:', yearsBuckets)
console.log('Service charge extracted:', scExtracted, `(${Math.round(scExtracted/totalLeasehold*100)}%)`)
console.log('Ground rent extracted:', grExtracted, `(${Math.round(grExtracted/totalLeasehold*100)}%)`)
console.log('\n---- LEASE YEARS SAMPLES ----')
console.log(JSON.stringify(yearsSamples, null, 2))
console.log('\n---- SERVICE CHARGE SAMPLES ----')
console.log(JSON.stringify(scSamples, null, 2))
console.log('\n---- GROUND RENT SAMPLES ----')
console.log(JSON.stringify(grSamples, null, 2))
