import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Pull the three listings that showed structured "Lease Years Remaining: N" — dump their full raw_data.
const ids = [
  '17a62792-597d-479b-99f3-1201dd3d70f4',  // Drayton Gardens — has Lease Years Remaining
  'd83b77e7-19e0-4649-b1b0-0cfdae02c452',  // Charles Street — has Service Charge: £21,690 + Lease Years Remaining
  '64833a31-47c1-48dc-8266-0b150ae0a4ed',  // Mandarin Oriental — has Service Charge AND Ground Rent
]

const { data, error } = await supabase
  .from('listings')
  .select('id, address, raw_data')
  .in('id', ids)

if (error) { console.error(error); process.exit(1) }

for (const l of data) {
  const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})
  console.log('\n========================================')
  console.log('ID:', l.id)
  console.log('Address:', l.address)
  console.log('Top-level raw_data keys:', Object.keys(rd))
  console.log('letting_details:', JSON.stringify(rd.letting_details, null, 2))
  console.log('additional:', JSON.stringify(rd.additional, null, 2))
  console.log('key_features (first 5):', (rd.key_features || []).slice(0, 5))
  // Hunt anywhere in the full JSON dump for "Lease" / "Service Charge" / "Ground Rent"
  const full = JSON.stringify(rd)
  const hits = [
    ...(full.match(/.{0,40}Lease Years Remaining.{0,40}/gi) || []),
    ...(full.match(/.{0,40}Service Charge.{0,80}/gi) || []),
    ...(full.match(/.{0,40}Ground Rent.{0,80}/gi) || []),
  ]
  console.log('Pattern hits in full raw_data JSON:')
  for (const h of hits.slice(0, 8)) console.log('  ', h)
}
