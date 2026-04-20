import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { valuate, type PropertySpec, type Comparable } from '@/lib/valuation'

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const spec = await req.json() as PropertySpec

    // Minimum required inputs to attempt valuation
    if (!spec.square_feet || spec.bedrooms == null || !spec.listing_type) {
      return NextResponse.json({ result: null, reason: 'Missing required inputs' })
    }

    // Pull candidate comparables: same listing_type, active, with usable size/price,
    // same borough or postcode-district if borough is missing
    const sb = svc()
    let q = sb.from('listings')
      .select('id, listing_type, price, bedrooms, square_feet, property_type, borough, postcode')
      .eq('listing_type', spec.listing_type)
      .eq('is_active', true)
      .not('square_feet', 'is', null)
      .not('price', 'is', null)
      .limit(200)

    if (spec.borough) {
      q = q.eq('borough', spec.borough)
    } else if (spec.postcode) {
      const district = spec.postcode.split(' ')[0]
      q = q.ilike('postcode', district + '%')
    }

    const { data: pool } = await q
    const result = valuate(spec, (pool || []) as Comparable[])

    return NextResponse.json({ result })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Valuation failed' }, { status: 500 })
  }
}
