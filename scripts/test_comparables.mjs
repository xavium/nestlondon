import { createClient } from '@supabase/supabase-js'
import { getSoldPriceComparison } from '../lib/soldPriceComparables.ts'

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Get all active buy listings with a postcode
const { data: listings } = await c
  .from('listings')
  .select('id, address, postcode, property_type, price, listing_type')
  .eq('listing_type', 'buy')
  .eq('is_active', true)
  .is('canonical_listing_id', null)
  .not('postcode', 'is', null)
  .limit(5)

console.log('Testing', listings.length, 'buy listings:\n')

for (const l of listings) {
  const result = await getSoldPriceComparison(c, l)
  console.log(l.id.slice(0,8), '| £' + l.price + ' |', l.property_type, '|', l.postcode, '|', l.address?.slice(0, 40))
  if (result) {
    console.log('  ✓ n=' + result.sampleSize, 'median=£' + result.median.toLocaleString(), 'signal=' + result.signal, 'conf=' + result.confidence)
  } else {
    console.log('  ✗ returned NULL')
  }
}
