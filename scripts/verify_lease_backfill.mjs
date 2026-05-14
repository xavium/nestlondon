import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('listings')
  .select('id, address, lease_years_remaining, service_charge_annual, ground_rent_annual, raw_data')
  .or('lease_years_remaining.not.is.null,service_charge_annual.not.is.null,ground_rent_annual.not.is.null')
  .limit(20)

if (error) { console.error(error); process.exit(1) }

console.log(`Found ${data.length} listings with at least one lease field populated:\n`)
for (const l of data) {
  const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})
  const tenure = rd?.letting_details?.Tenure || '(none)'
  console.log(`  ${l.address.slice(0, 60).padEnd(60)} | tenure: ${tenure.slice(0, 30).padEnd(30)} | yrs: ${String(l.lease_years_remaining ?? '-').padStart(4)} | sc: £${String(l.service_charge_annual ?? '-').padStart(6)} | gr: £${String(l.ground_rent_annual ?? '-').padStart(5)}`)
}
