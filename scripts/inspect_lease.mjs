import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('listings')
  .select('id, address, raw_data')
  .eq('listing_type', 'buy')
  .eq('is_active', true)
  .limit(50)

if (error) { console.error(error); process.exit(1) }

const leaseKeys = new Set()
const samples = []

for (const l of data) {
  const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})
  const details = rd.letting_details || {}
  for (const k of Object.keys(details)) {
    const lower = k.toLowerCase()
    if (lower.includes('lease') || lower.includes('service') || lower.includes('ground') || lower.includes('tenure') || lower.includes('charge') || lower.includes('rent')) {
      leaseKeys.add(k)
    }
  }
  const additional = rd.additional || {}
  for (const k of Object.keys(additional)) {
    const lower = k.toLowerCase()
    if (lower.includes('lease') || lower.includes('service') || lower.includes('ground') || lower.includes('tenure') || lower.includes('charge')) {
      leaseKeys.add('additional.' + k)
    }
  }
  if (samples.length < 5) {
    const interesting = {}
    for (const k of Object.keys(details)) {
      const lower = k.toLowerCase()
      if (lower.includes('lease') || lower.includes('service') || lower.includes('ground') || lower.includes('tenure') || lower.includes('charge') || lower.includes('rent')) {
        interesting[k] = details[k]
      }
    }
    if (Object.keys(interesting).length > 0) {
      samples.push({ id: l.id, address: l.address, lease: interesting })
    }
  }
}

console.log('---- LEASE-RELATED KEYS FOUND ----')
console.log(Array.from(leaseKeys).sort())
console.log('\n---- SAMPLE VALUES ----')
console.log(JSON.stringify(samples, null, 2))
