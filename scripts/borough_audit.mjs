import { createClient } from '@supabase/supabase-js'
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data } = await c.from('listings')
  .select('borough, address, postcode')
  .eq('is_active', true)
  .is('canonical_listing_id', null)

function district(input) {
  if (!input) return null
  const m = input.trim().toUpperCase().match(/(?:^|[\s,])([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s|,|$)/)
  return m ? m[1] : null
}

const samples = ['NW1', 'NW6', 'NW10', 'NW11', 'E1', 'E2', 'SE1', 'SE16', 'SW6', 'SW18', 'W4', 'W6']
for (const pc of samples) {
  const matches = data.filter(d => {
    return district(d.postcode) === pc || district(d.address) === pc
  })
  if (matches.length === 0) {
    console.log(pc + ': (no listings)')
    continue
  }
  // Show one example per unique borough mapping for that postcode
  const boroughs = new Map()
  matches.forEach(m => {
    if (!boroughs.has(m.borough)) boroughs.set(m.borough, m.address || '(no address)')
  })
  console.log(pc + ': ' + matches.length + ' listings')
  for (const [b, addr] of boroughs.entries()) {
    console.log('  ' + (b || 'NULL') + ' | e.g. ' + addr.slice(0, 60))
  }
}
