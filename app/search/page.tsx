import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

interface SearchParams {
  location?: string
  type?: string
  minBeds?: string
  maxPrice?: string
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const location = params.location || ''
  const listingType = params.type || 'rent'
  const minBeds = params.minBeds ? parseInt(params.minBeds) : null
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : null

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
    query = query.or(
      'address.ilike.%' + location + '%,' +
      'postcode.ilike.' + loc + ' %,' +
      'postcode.eq.' + loc + ',' +
      'borough.ilike.%' + location + '%'
    )
  }
  if (minBeds) query = query.gte('bedrooms', minBeds)
  if (maxPrice) query = query.lte('price', maxPrice)

  const { data: listings, error } = await query
  if (error) console.error(error)

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-stone-800 no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span className="text-green-800 italic">london</span>
        </Link>
      </nav>
      <div className="bg-white border-b border-stone-100 px-6 py-4">
        <form method="GET" action="/search" className="flex items-center gap-3 max-w-2xl">
          <input
            name="location"
            defaultValue={location}
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2 text-sm text-stone-800 outline-none focus:border-green-700"
            placeholder="Area, postcode or station"
          />
          <input type="hidden" name="type" value={listingType} />
          <button type="submit" className="bg-green-800 text-white text-sm px-5 py-2 rounded-xl hover:bg-green-900">
            Search
          </button>
        </form>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-sm text-stone-500">
            {listings?.length || 0} properties{location ? ' matching ' + location : ' in London'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[1,2,3,4].map(b => (
              <a key={b}
                href={'/search?' + new URLSearchParams({ ...(location && { location }), type: listingType, minBeds: String(b), ...(maxPrice && { maxPrice: String(maxPrice) }) }).toString()}
                className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (minBeds === b ? 'bg-green-800 text-white border-green-800' : 'bg-white text-stone-500 border-stone-200 hover:border-green-700')}
              >{b}+ beds</a>
            ))}
            {[1000,1500,2000,2500,3000].map(p => (
              <a key={p}
                href={'/search?' + new URLSearchParams({ ...(location && { location }), type: listingType, ...(minBeds && { minBeds: String(minBeds) }), maxPrice: String(p) }).toString()}
                className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (maxPrice === p ? 'bg-green-800 text-white border-green-800' : 'bg-white text-stone-500 border-stone-200 hover:border-green-700')}
              >Under £{p.toLocaleString()}</a>
            ))}
          </div>
        </div>
        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing: any) => (
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

function ListingCard({ listing }: { listing: any }) {
  let imgSrc: string | null = null
  try {
    const raw = listing.images
    let arr: string[] = []
    if (typeof raw === 'string' && raw.length > 2) {
      arr = JSON.parse(raw)
    } else if (Array.isArray(raw)) {
      arr = raw
    }
    const found = arr.find((u: string) => typeof u === 'string' && u.startsWith('https')) || null
    if (found) {
      imgSrc = found.replace('https://media.rightmove.co.uk/', '/img/')
    }
  } catch {}


  return (
    <Link href={'/listings/' + listing.id} className="block bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-stone-300 transition-colors no-underline">
      <div className="relative h-48 bg-stone-100 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={listing.address} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1"/>
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-white/90 text-stone-500 text-xs px-2 py-0.5 rounded">
          {listing.source}
        </div>
      </div>
      <div className="p-4">
        <div className="text-lg text-stone-800 mb-0.5" style={{fontFamily:'Georgia,serif'}}>
          £{listing.price?.toLocaleString()} <span className="text-xs text-stone-400 font-sans">/{listing.price_period}</span>
        </div>
        <div className="text-sm text-stone-500 mb-3 truncate">{listing.address}</div>
        <div className="flex gap-3 text-xs text-stone-400 mb-4">
          {listing.bedrooms && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms && <span>{listing.bathrooms} bath</span>}
          {listing.property_type && <span>{listing.property_type}</span>}
        </div>
        <div className="w-full bg-green-800 text-white text-xs rounded-lg py-2 text-center">
          View property
        </div>
      </div>
    </Link>
  )
}
