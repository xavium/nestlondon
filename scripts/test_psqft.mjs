import { createClient } from '@supabase/supabase-js'
import { getPricePerSqftComparison } from '../lib/pricePerSqftComparables.ts'

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Same Squires Mount NW3 listing
const {data: l} = await c.from('listings').select('id, postcode, address, property_type, price, listing_type, raw_data').eq('id', '31d07dc5-5a5c-490c-9994-3c5830db9aa0').single()
console.log('listing:', l.address, '|', l.property_type, '|', '£' + l.price)

const result = await getPricePerSqftComparison(c, l)
console.log('result:', result)
