import { createClient } from '@supabase/supabase-js'
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const sample = await c.from('sold_prices').select('property_type, price').limit(5000)
const byType = {}
for (const r of sample.data) {
  if (byType[r.property_type] === undefined) byType[r.property_type] = []
  byType[r.property_type].push(Number(r.price))
}
for (const [t, prices] of Object.entries(byType)) {
  prices.sort((a,b) => a-b)
  const med = prices[Math.floor(prices.length/2)]
  console.log(t, 'n=' + prices.length, 'median=£' + med.toLocaleString(), 'range=£' + prices[0].toLocaleString() + ' to £' + prices[prices.length-1].toLocaleString())
}

const sw7 = await c.from('sold_prices').select('property_type, price').eq('postcode_district', 'SW7').gte('date_of_transfer', '2025-05-18')
const fs = sw7.data.filter(d => d.property_type === 'F').map(d => Number(d.price)).sort((a,b) => a-b)
console.log()
console.log('SW7 flats in last 12 months: n=' + fs.length)
if (fs.length) {
  console.log('  median: £' + fs[Math.floor(fs.length/2)].toLocaleString())
  console.log('  range: £' + fs[0].toLocaleString() + ' - £' + fs[fs.length-1].toLocaleString())
}
