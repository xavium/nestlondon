import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import SearchBarClient from '@/components/SearchBarClient'
import SearchFilters from '@/components/SearchFilters'
import ListingCard from '@/components/ListingCard'

interface SearchParams {
  location?: string
  type?: string
  minBeds?: string
  maxBeds?: string
  minPrice?: string
  maxPrice?: string
  furnished?: string
  propertyType?: string
  features?: string
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const location = params.location || ''
  const listingType = params.type || 'rent'
  const minBeds = params.minBeds ? parseInt(params.minBeds) : null
  const maxBeds = params.maxBeds ? parseInt(params.maxBeds) : null
  const minPrice = params.minPrice ? parseInt(params.minPrice) : null
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : null
  const furnished = params.furnished || null
  const propertyType = params.propertyType || null
  const features = params.features ? params.features.split(',') : []

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .eq('listing_type', listingType)
    .order('created_at', { ascending: false })
    .limit(48)

  if (location) {
    const loc = location.trim().toUpperCase()
    const isPostcode = /^[A-Z]{1,2}[0-9]{1,2}$/.test(loc)
    if (isPostcode) {
      query = query.eq('borough', loc)
    } else {
      query = query.or('address.ilike.%' + location + '%,borough.ilike.%' + location + '%')
    }
  }
  if (minBeds) query = query.gte('bedrooms', minBeds)
  if (maxBeds) query = query.lte('bedrooms', maxBeds)
  if (minPrice) query = query.gte('price', minPrice)
  if (maxPrice) query = query.lte('price', maxPrice)
  if (propertyType) query = query.ilike('property_type', '%' + propertyType + '%')
  if (furnished) query = query.ilike('furnished', '%' + furnished + '%')

  const { data: listings, error } = await query
  if (error) console.error(error)

  const mustHaveFeatures = features.filter((f: string) => !f.startsWith('exclude:'))
  const excludeFeatures = features.filter((f: string) => f.startsWith('exclude:')).map((f: string) => f.replace('exclude:', ''))

  const filtered = (listings || []).filter((listing: any) => {
    const desc = (listing.description || '').toLowerCase()
    const feats = JSON.stringify(listing.features || '').toLowerCase()
    const combined = desc + ' ' + feats
    for (const f of mustHaveFeatures) {
      if (!combined.includes(f.toLowerCase())) return false
    }
    for (const f of excludeFeatures) {
      if (f === 'New builds' && combined.includes('new build')) return false
      if (f === 'Shared ownership' && combined.includes('shared ownership')) return false
      if (f === 'Retirement homes' && combined.includes('retirement')) return false
    }
    return true
  })

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-stone-800 no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span className="text-green-800 italic">london</span>
        </Link>
      </nav>
      <div className="bg-white border-b border-stone-100 px-6 py-4">
        <div className="flex items-center gap-3 max-w-4xl">
          <div className="flex-1">
            <SearchBarClient location={location} listingType={listingType} minBeds={minBeds} maxPrice={maxPrice} />
          </div>
          <SearchFilters
            location={location}
            listingType={listingType}
            minBeds={minBeds}
            maxBeds={maxBeds}
            minPrice={minPrice}
            maxPrice={maxPrice}
            furnished={furnished}
            propertyType={propertyType}
            features={features}
          />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-stone-500">
            {filtered.length} properties{location ? ' in ' + location : ' in London'}
          </p>
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-stone-400 text-sm">No properties found.</p>
            <Link href="/search" className="text-green-800 text-sm mt-2 inline-block">Clear filters</Link>
          </div>
        )}
      </div>
    </main>
  )
}
