import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ImageGallery from '@/components/ImageGallery'
import PropertyMap from '@/components/PropertyMap'
import MarkViewed from '@/components/MarkViewed'
import FloorplanSize from '@/components/FloorplanSize'
import ShareButton from '@/components/ShareButton'

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string,string>> }) {
  const { id } = await params
  const sp = await searchParams
  const fromSearch = sp.from ? decodeURIComponent(sp.from) : null
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  let nearbyListings: any[] = []
  if (listing.latitude && listing.longitude) {
    const { data: nearby } = await supabase
      .from('listings')
      .select('id,address,price,latitude,longitude,bedrooms,property_type,images')
      .eq('is_active', true)
      .neq('id', id)
      .not('latitude', 'is', null)
      .limit(500)
    nearbyListings = nearby || []
  }

  const rawData = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
  const keyFeatures: string[] = rawData?.key_features || []
  const floorplans: string[] = rawData?.floorplans || []
  const lettingDetails: Record<string, string> = rawData?.letting_details || {}

  let images: string[] = []
  try {
    const raw = listing.images
    images = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
    images = images.filter((u: string) => typeof u === 'string' && u.startsWith('https'))
  } catch {}

  const sizeTextRaw: string | null = rawData?.size_text || null
  let sizeText: string | null = null
  if (sizeTextRaw) {
    const sqftM = sizeTextRaw.match(/([\d,]+)\s*sq\s*ft/i)
    const sqmM = sizeTextRaw.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
    if (sqftM) {
      const sqftVal = parseFloat(sqftM[1].replace(',',''))
      const sqmVal = Math.round(sqftVal * 0.0929)
      sizeText = sqftVal.toLocaleString() + ' sq ft / ' + sqmVal + ' sq m'
    } else if (sqmM) {
      const sqmVal = parseFloat(sqmM[1].replace(',',''))
      const sqftVal = Math.round(sqmVal * 10.764)
      sizeText = sqftVal.toLocaleString() + ' sq ft / ' + sqmVal + ' sq m'
    } else {
      sizeText = sizeTextRaw
    }
  }

  function extractSqm(text: string): number | null {
    if (!text) return null
    const sqmMatch = text.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
    const sqftMatch = text.match(/([\d,]+)\s*sq(?:uare)?\s*f(?:ee|oo)?t/i)
    const sqftMatch2 = text.match(/([\d,]+)\s*ft[²2]/i)
    const sqmMatch2 = text.match(/([\d,]+)\s*m[²2]/i)
    if (sqmMatch) return parseFloat(sqmMatch[1].replace(',', ''))
    if (sqmMatch2) return parseFloat(sqmMatch2[1].replace(',', ''))
    if (sqftMatch) return Math.round(parseFloat(sqftMatch[1].replace(',', '')) * 0.0929)
    if (sqftMatch2) return Math.round(parseFloat(sqftMatch2[1].replace(',', '')) * 0.0929)
    return null
  }

  let rentPerSqm: string = 'Ask agent'
  let resolvedSize: string | null = sizeText

  if (listing.price) {
    let sqm: number | null = null
    if (sizeText) sqm = extractSqm(sizeText)
    if (!sqm && listing.description) {
      sqm = extractSqm(listing.description)
      if (sqm) {
        const sqftFromDesc = Math.round(sqm * 10.764)
        resolvedSize = sqftFromDesc.toLocaleString() + ' sq ft / ' + sqm + ' sq m'
      }
    }
    if (!sqm && keyFeatures.length > 0) {
      for (const f of keyFeatures) {
        sqm = extractSqm(f)
        if (sqm) {
          const sqftFromFeat = Math.round(sqm * 10.764)
          resolvedSize = sqftFromFeat.toLocaleString() + ' sq ft / ' + sqm + ' sq m'
          break
        }
      }
    }
    if (sqm && sqm > 10 && sqm < 1000) {
      rentPerSqm = '£' + Math.round(listing.price / sqm).toLocaleString()
    }
  }

  const isDirectListing = !!listing.agent_id

  // Fetch listings from the user's search context
  let searchListings: any[] = []
  if (fromSearch) {
    try {
      const sp2 = new URLSearchParams(fromSearch)
      const loc = sp2.get('location') || ''
      const minB = sp2.get('minBeds') ? parseInt(sp2.get('minBeds')!) : null
      const maxP = sp2.get('maxPrice') ? parseInt(sp2.get('maxPrice')!) : null
      const minP = sp2.get('minPrice') ? parseInt(sp2.get('minPrice')!) : null
      const furn = sp2.get('furnished') || null
      const ptype = sp2.get('propertyType') || null
      let q = supabase.from('listings').select('id,address,price,images,bedrooms,bathrooms,property_type,borough,latitude,longitude').eq('is_active', true).neq('id', id).limit(6)
      if (loc) {
        const locU = loc.trim().toUpperCase()
        const isPC = /^[A-Z]{1,2}[0-9]{1,2}$/.test(locU)
        if (isPC) q = q.eq('borough', locU)
      }
      if (minB) q = q.gte('bedrooms', minB)
      if (minP) q = q.gte('price', minP)
      if (maxP) q = q.lte('price', maxP)
      if (furn) q = q.ilike('furnished', '%' + furn + '%')
      if (ptype) q = q.ilike('property_type', '%' + ptype + '%')
      const { data: sl } = await q
      searchListings = sl || []
    } catch {}
  }
  const listingPrice: number = typeof listing.price === 'number' ? listing.price : parseInt(String(listing.price || '0'), 10)

  let cleanDescription = listing.description || ''
  const structuredDetails: Record<string, string> = {}
  if (cleanDescription) {
    const markers = ['COUNCIL TAX', 'Read full description', 'Energy performance certificate']
    let cutoff = cleanDescription.length
    for (const m of markers) {
      const idx = cleanDescription.indexOf(m)
      if (idx > 0 && idx < cutoff) cutoff = idx
    }
    const structured = cleanDescription.slice(cutoff)
    cleanDescription = cleanDescription.slice(0, cutoff).trim()
    const parkingMatch = structured.match(/Parking[^\n]*[:\-]\s*([^\n]+)/i)
    if (parkingMatch) structuredDetails['Parking'] = parkingMatch[1].trim()
    const gardenMatch = structured.match(/Garden[^\n]*[:\-]\s*([^\n]+)/i)
    if (gardenMatch) structuredDetails['Garden'] = gardenMatch[1].trim()
    const accessMatch = structured.match(/Accessibility[^\n]*[:\-]\s*([^\n]+)/i)
    if (accessMatch) structuredDetails['Accessibility'] = accessMatch[1].trim()
  }

  // Search ALL text sources for EPC and Council Tax
  const allText = [listing.description || '', ...keyFeatures, JSON.stringify(rawData?.letting_details || {}), JSON.stringify(rawData?.additional || {})].join(' ')

  // Only match EPC band when letter is clearly isolated e.g. 'EPC-B', 'EPC: C', 'EPC Rating B'
  const epcMatch = allText.match(/EPC[\s\-:_]+([A-G])\b/i) ||
                   allText.match(/EPC\s+[Rr]ating[\s:\-]+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Cc]lass[\s:\-]+([A-G])\b/i)
  structuredDetails['EPC Rating'] = epcMatch ? 'Band ' + epcMatch[1].toUpperCase() : 'Ask agent'

  if (!structuredDetails['Council Tax']) {
    const ctMatch = allText.match(/council.tax.band.{0,3}([A-H])/i) || allText.match(/tax.band.{0,3}([A-H])/i) || allText.match(/council.tax[^A-H]{0,30}([A-H])/i)
    structuredDetails['Council Tax'] = ctMatch ? 'Band ' + ctMatch[1].toUpperCase() : 'Ask agent'
  }

  return (
    <main className="min-h-screen bg-[#F1EFE8]">
      <nav className="bg-white border-b border-stone-200 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-stone-800" style={{fontFamily: 'Georgia, serif'}}>NestLondon</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <MarkViewed id={id} />
        <Link href="/search" className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-4">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to search
        </Link>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-stone-800 mb-1" style={{fontFamily: 'Georgia, serif'}}>{listing.address}</h1>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-stone-900" style={{fontFamily: 'Georgia, serif'}}>£{listing.price?.toLocaleString()}</span>
            <span className="text-stone-400 text-sm">per month</span>
            {listing.price && <span className="text-stone-400 text-sm">£{Math.round(listing.price / 4.33).toLocaleString()} per week</span>}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {listing.bedrooms && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.bedrooms} bed</span>}
            {listing.bathrooms && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.bathrooms} bath</span>}
            {listing.property_type && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.property_type}</span>}
          </div>
        </div>
      </div>

      {/* Full width photos */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <ImageGallery images={images} address={listing.address} floorplans={floorplans} listedAt={listing.listed_at} shareButton={<ShareButton address={listing.address} price={listing.price} />} />
        <div className="flex justify-end mt-2">
          <ShareButton address={listing.address} price={listing.price} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-5">


            {Object.keys(lettingDetails).length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-4">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Letting details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(lettingDetails).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-stone-400">{k}</div>
                      <div className="text-sm text-stone-800 font-semibold">{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 items-stretch">
              <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Type</div>
                <div className="text-sm font-medium text-stone-700">{listing.property_type || '—'}</div>
              </div>
              <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Bedrooms</div>
                <div className="text-sm font-medium text-stone-700">{listing.bedrooms ?? '—'}</div>
              </div>
              <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Bathrooms</div>
                <div className="text-sm font-medium text-stone-700">{listing.bathrooms ?? '—'}</div>
              </div>
              {resolvedSize ? (
                <>
                  <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
                    <div className="text-sm font-medium text-stone-700">{resolvedSize}</div>
                  </div>
                  <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/sqm</div>
                    <div className="text-sm font-medium text-stone-700">{rentPerSqm}</div>
                  </div>
                </>
              ) : floorplans.length > 0 ? (
                <FloorplanSize key={floorplans[0]} floorplanUrl={floorplans[0]} price={listingPrice} />
              ) : (
                <>
                  <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
                    <div className="text-sm font-medium text-stone-700">Ask agent</div>
                  </div>
                  <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/sqm</div>
                    <div className="text-sm font-medium text-stone-700">Ask agent</div>
                  </div>
                </>
              )}
            </div>

            {keyFeatures.length > 0 && (
              <KeyFeatures features={keyFeatures} />
            )}

            {Object.keys(structuredDetails).length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-stone-800 mb-3">Property details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(structuredDetails).map(([k, v]) => (
                    <div key={k} className="bg-[#F1EFE8] rounded-xl p-3 text-center flex flex-col items-center justify-center">
                      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{k}</div>
                      <div className="text-sm font-semibold text-stone-800">{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cleanDescription && (
              <div className="bg-white border border-stone-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-stone-800 mb-3">Description</h2>
                <div className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{cleanDescription}</div>
              </div>
            )}

            {listing.latitude && listing.longitude && (
              <PropertyMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                address={listing.address}
                price={listing.price}
                nearbyListings={nearbyListings}
              />
            )}

            <div className="text-xs text-stone-400 pt-2">
              Listed on {listing.source}
              {listing.source_url && (
                <span> · <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">View original listing</a></span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {isDirectListing ? (
              <EnquiryForm listing={listing} />
            ) : (
              <ExternalLinkCard listing={listing} />
            )}

            {searchListings.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">From your search</h3>
                <div className="flex flex-col gap-3">
                  {searchListings.map((sl: any) => {
                    let slImg: string | null = null
                    try {
                      const arr = typeof sl.images === 'string' ? JSON.parse(sl.images) : (sl.images || [])
                      slImg = arr.find((u: string) => u?.startsWith('https')) || null
                    } catch {}
                    return (
                      <a key={sl.id} href={'/listings/' + sl.id + (fromSearch ? '?from=' + encodeURIComponent(fromSearch) : '')} className="flex gap-3 group">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          {slImg ? <img src={slImg} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-stone-100" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-stone-800 truncate group-hover:text-orange-700 transition-colors">{sl.address}</div>
                          <div className="text-sm font-semibold text-stone-900 mt-0.5">£{sl.price?.toLocaleString()}<span className="text-xs text-stone-400 font-normal">/mo</span></div>
                          <div className="text-xs text-stone-400">{sl.bedrooms ? sl.bedrooms + ' bed' : ''}{sl.property_type ? ' · ' + sl.property_type : ''}</div>
                        </div>
                      </a>
                    )
                  })}
                </div>
                {fromSearch && (
                  <a href={'/search' + fromSearch} className="block text-center text-xs text-orange-700 hover:underline mt-4">Back to search results →</a>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
    </main>
  )
}

function KeyFeatures({ features }: { features: string[] }) {
  const POSITIVE_KEYWORDS = [
    'view', 'river', 'park', 'garden', 'balcony', 'terrace', 'roof', 'penthouse',
    'gym', 'pool', 'concierge', 'porter', 'spa', 'lounge', 'cinema', 'storage',
    'parking', 'garage', 'bike', 'furnished', 'wood floor', 'period', 'victorian',
    'georgian', 'high ceiling', 'natural light', 'south facing', 'double glazed',
    'split level', 'duplex', 'mews', 'ground floor', 'top floor', 'new build',
    'refurb', 'modern', 'contemporary', 'open plan', 'en-suite', 'walk-in',
  ]
  const FACT_KEYWORDS = [
    'epc', 'council tax', 'available', 'deposit', 'tenancy', 'let type',
    'reference', 'property ref', 'no agent', 'students', 'dss',
  ]
  const cleanFeatures: string[] = []
  features.forEach(raw => {
    const p1 = raw.split(/(?<=[a-z])(?=[A-Z])/)
    const p2: string[] = []
    p1.forEach(p => p.split(/(?<=[0-9])(?=[A-Z])/).forEach((s: string) => p2.push(s)))
    const p3: string[] = []
    p2.forEach(p => p.split(/(?<=-[A-Z])(?=[A-Z])/).forEach((s: string) => p3.push(s)))
    const p4: string[] = []
    p3.forEach(p => p.split(/(?<=[a-z]{2})(?=[0-9])/).forEach((s: string) => p4.push(s)))
    p4.forEach(p => { if (p.trim().length > 2) cleanFeatures.push(p.trim()) })
  })
  const filteredFeatures = cleanFeatures.filter(f => {
    const l = f.toLowerCase()
    return !l.startsWith('epc') && !l.startsWith('council tax') &&
           !l.includes('property ref') && !l.includes('reference number')
  })
  const highlights: string[] = []
  const facts: string[] = []
  const other: string[] = []
  filteredFeatures.forEach(f => {
    const lower = f.toLowerCase()
    if (FACT_KEYWORDS.some(k => lower.includes(k))) facts.push(f)
    else if (POSITIVE_KEYWORDS.some(k => lower.includes(k))) highlights.push(f)
    else other.push(f)
  })
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
      {highlights.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Highlights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {highlights.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <svg className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
      {other.length > 0 && (
        <div className="pt-3 border-t border-stone-100">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {other.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-stone-600">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0 mt-2" />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
      {facts.length > 0 && (
        <div className="border-t border-stone-100 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {facts.map((f, i) => (
              <div key={i} className="bg-[#F1EFE8] rounded-lg px-3 py-2 text-xs text-stone-600 text-center font-semibold">{f}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExternalLinkCard({ listing }: { listing: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 sticky top-6">
      <div className="mb-4">
        <div className="text-2xl font-bold text-stone-900 mb-0.5" style={{fontFamily: 'Georgia, serif'}}>£{listing.price?.toLocaleString()}</div>
        <div className="text-sm text-stone-400">per month</div>
        {listing.price && <div className="text-sm text-stone-400">£{Math.round(listing.price / 4.33).toLocaleString()} per week</div>}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {listing.bedrooms && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.bedrooms} bed</span>}
        {listing.bathrooms && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.bathrooms} bath</span>}
        {listing.property_type && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">{listing.property_type}</span>}
      </div>
      {listing.source_url ? (
        <a href={listing.source_url} target="_blank" rel="noopener noreferrer"
          className="block w-full bg-orange-700 text-white text-sm rounded-lg py-3 text-center hover:bg-orange-800 transition-colors mb-3">
          View on {listing.source} →
        </a>
      ) : (
        <div className="w-full bg-stone-200 text-stone-400 text-sm rounded-lg py-3 text-center">Source unavailable</div>
      )}
      <p className="text-xs text-stone-400 text-center">Enquire directly on {listing.source}. NestLondon does not charge tenants any fees.</p>
    </div>
  )
}

function EnquiryForm({ listing }: { listing: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 sticky top-6">
      <h3 className="text-sm font-medium text-stone-800 mb-1">Enquire about this property</h3>
      <p className="text-xs text-stone-400 mb-5">Direct listing — no portal fees</p>
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-orange-600" placeholder="Your name" />
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-orange-600" placeholder="Email address" />
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-orange-600" placeholder="Phone number" />
      <textarea className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-orange-600 min-h-20 resize-none" placeholder="I am interested in arranging a viewing..." />
      <button className="w-full bg-orange-700 text-white rounded-lg py-2.5 text-sm hover:bg-orange-800 transition-colors">Send enquiry</button>
      <p className="text-xs text-stone-400 mt-3 text-center">NestLondon does not charge tenants any fees.</p>
    </div>
  )
}
