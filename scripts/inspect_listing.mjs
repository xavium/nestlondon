import { createClient } from '@supabase/supabase-js'
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const {data: l} = await c.from('listings').select('id, address, postcode, price, property_type, listing_type, is_active, canonical_listing_id').eq('id', '31d07dc5-5a5c-490c-9994-3c5830db9aa0').single()
if (l === null) { console.log('NOT FOUND'); process.exit() }
console.log('listing:', JSON.stringify(l, null, 2))

// Also try the function directly
const {getSoldPriceComparison} = await import('../lib/soldPriceComparables.ts')
const result = await getSoldPriceComparison(c, l)
console.log('\nfunction returns:', result)
