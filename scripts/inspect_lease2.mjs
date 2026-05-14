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
  .limit(200)

if (error) { console.error(error); process.exit(1) }

// Search the entire raw_data + description for lease/service/ground patterns
// using flexible regexes.
const RX = {
  serviceCharge: /service\s+charge[^\.]{0,80}/gi,
  groundRent: /ground\s+rent[^\.]{0,80}/gi,
  leaseYears: /(\d{2,4})\s*year[s]?\s*(?:lease|remaining|left|unexpired)/gi,
  leasePhrase: /lease[:\s]+[^\.\n]{0,80}/gi,
}

const stats = { totalLeasehold: 0, sc: 0, gr: 0, ly: 0, leaseMention: 0 }
const samples = { sc: [], gr: [], ly: [], leaseMention: [] }

for (const l of data) {
  const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})
  const tenure = (rd.letting_details?.Tenure || '').toLowerCase()
  if (!tenure.includes('lease')) continue  // only care about leaseholds
  stats.totalLeasehold++

  // Combine all text sources
  const haystack = [
    l.description || '',
    JSON.stringify(rd.key_features || []),
    JSON.stringify(rd.letting_details || {}),
    JSON.stringify(rd.additional || {}),
  ].join(' ')

  const sc = haystack.match(RX.serviceCharge)
  const gr = haystack.match(RX.groundRent)
  const ly = haystack.match(RX.leaseYears)
  const lp = haystack.match(RX.leasePhrase)

  if (sc) { stats.sc++; if (samples.sc.length < 5) samples.sc.push({ id: l.id, address: l.address, hits: sc.slice(0, 2) }) }
  if (gr) { stats.gr++; if (samples.gr.length < 5) samples.gr.push({ id: l.id, address: l.address, hits: gr.slice(0, 2) }) }
  if (ly) { stats.ly++; if (samples.ly.length < 5) samples.ly.push({ id: l.id, address: l.address, hits: ly.slice(0, 2) }) }
  if (lp) { stats.leaseMention++; if (samples.leaseMention.length < 8) samples.leaseMention.push({ id: l.id, address: l.address, hits: lp.slice(0, 3) }) }
}

console.log('---- STATS ----')
console.log('Total leasehold (of 200 buy listings checked):', stats.totalLeasehold)
console.log('  with "service charge" mention:', stats.sc)
console.log('  with "ground rent" mention:', stats.gr)
console.log('  with "N years (lease|remaining|left|unexpired)" mention:', stats.ly)
console.log('  with any "lease:" or "lease " phrase:', stats.leaseMention)

console.log('\n---- SERVICE CHARGE SAMPLES ----')
console.log(JSON.stringify(samples.sc, null, 2))
console.log('\n---- GROUND RENT SAMPLES ----')
console.log(JSON.stringify(samples.gr, null, 2))
console.log('\n---- LEASE YEARS SAMPLES ----')
console.log(JSON.stringify(samples.ly, null, 2))
console.log('\n---- LEASE PHRASE SAMPLES ----')
console.log(JSON.stringify(samples.leaseMention, null, 2))
