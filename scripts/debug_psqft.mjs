import { createClient } from '@supabase/supabase-js'
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Squires Mount listing
const {data: l} = await c.from('listings').select('id, address, property_type, price, raw_data').eq('id', '31d07dc5-5a5c-490c-9994-3c5830db9aa0').single()
const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data) : (l.raw_data || {})
console.log('Squires Mount size_text:', JSON.stringify(rd.size_text))
console.log()

// How many NW3 houses have size data?
const {data: all} = await c.from('listings').select('id, address, postcode, property_type, price, raw_data')
  .eq('listing_type', 'buy').eq('is_active', true).is('canonical_listing_id', null)

function district(input) {
  if (!input) return null
  const m = input.trim().toUpperCase().match(/(?:^|[\s,])([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s|,|$)/)
  return m ? m[1] : null
}
function broadType(t) {
  const s = (t || '').toLowerCase()
  if (/flat|apartment|maisonette|studio/.test(s)) return 'flat'
  if (/house|detached|terrace|semi|bungalow|cottage|mews/.test(s)) return 'house'
  return null
}
function sqft(rd) {
  if (!rd) return null
  const r = typeof rd === 'string' ? JSON.parse(rd) : rd
  const t = (r.size_text || '').toString()
  const m = t.match(/([\d,]+)\s*sq\s*ft/i)
  if (m) return parseInt(m[1].replace(/,/g, ''))
  const sm = t.match(/([\d,]+(?:\.\d+)?)\s*sq\s*m/i)
  if (sm) return Math.round(parseFloat(sm[1]) * 10.7639)
  return null
}

const nw3Houses = all.filter(x => {
  const d = district(x.postcode) || district(x.address)
  return d === 'NW3' && broadType(x.property_type) === 'house'
})
console.log('NW3 houses total:', nw3Houses.length)
const withSize = nw3Houses.filter(x => sqft(x.raw_data) != null)
console.log('NW3 houses with size data:', withSize.length)
console.log('Examples:')
withSize.slice(0, 10).forEach(x => {
  const s = sqft(x.raw_data)
  console.log('  £' + x.price, '|', s + 'sqft', '|', x.property_type, '|', x.address?.slice(0, 50))
})
