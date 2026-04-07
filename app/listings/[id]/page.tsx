import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ImageGallery from '@/components/ImageGallery'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  let images: string[] = []
  try {
    images = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || [])
  } catch {}
  images = images.filter((u: string) => u && u.startsWith('http'))

  const isDirectListing = !!listing.agent_id

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-stone-800" style={{fontFamily:'Georgia,serif'}}>
          nest<span className="text-green-800 italic">london</span>
        </Link>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <Link href="/search" className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Back to results
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <ImageGallery images={images} address={listing.address} />
            <div>
              <h1 className="text-2xl font-light text-stone-800 mb-1" style={{fontFamily:'Georgia,serif'}}>{listing.address}</h1>
              {listing.postcode && <p className="text-stone-500 text-sm mb-4">{listing.postcode}</p>}
              <div className="text-3xl font-light text-stone-800 mb-4" style={{fontFamily:'Georgia,serif'}}>
                £{listing.price?.toLocaleString()} <span className="text-base text-stone-400">per {listing.price_period}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {listing.bedrooms && (
                  <div className="bg-stone-100 rounded-xl p-4 text-center">
                    <div className="text-xl text-stone-800" style={{fontFamily:'Georgia,serif'}}>{listing.bedrooms}</div>
                    <div className="text-xs text-stone-400 uppercase tracking-wide mt-1">Bedrooms</div>
                  </div>
                )}
                {listing.bathrooms && (
                  <div className="bg-stone-100 rounded-xl p-4 text-center">
                    <div className="text-xl text-stone-800" style={{fontFamily:'Georgia,serif'}}>{listing.bathrooms}</div>
                    <div className="text-xs text-stone-400 uppercase tracking-wide mt-1">Bathrooms</div>
                  </div>
                )}
                {listing.property_type && (
                  <div className="bg-stone-100 rounded-xl p-4 text-center">
                    <div className="text-sm text-stone-800">{listing.property_type}</div>
                    <div className="text-xs text-stone-400 uppercase tracking-wide mt-1">Type</div>
                  </div>
                )}
              </div>
              {listing.description && (
                <div className="mb-6">
                  <h2 className="text-sm font-medium text-stone-700 mb-2">Description</h2>
                  <p className="text-sm text-stone-500 leading-relaxed">{listing.description}</p>
                </div>
              )}
              <div className="text-xs text-stone-400 pt-4 border-t border-stone-200">
                Listed on {listing.source}
                {listing.source_url && (
                  <span> · <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-green-800 hover:underline">View original listing</a></span>
                )}
              </div>
            </div>
          </div>
          <div>
            {isDirectListing ? (
              <EnquiryForm listing={listing} />
            ) : (
              <ExternalLinkCard listing={listing} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function ExternalLinkCard({ listing }: { listing: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 sticky top-6">
      <div className="text-2xl font-light text-stone-800 mb-1" style={{fontFamily:'Georgia,serif'}}>£{listing.price?.toLocaleString()}</div>
      <div className="text-xs text-stone-400 mb-6">per {listing.price_period}</div>
      <div className="bg-stone-50 rounded-xl p-4 mb-5">
        <div className="flex gap-3 text-sm text-stone-600">
          {listing.bedrooms && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms && <span>{listing.bathrooms} bath</span>}
          {listing.property_type && <span>{listing.property_type}</span>}
        </div>
      </div>
      {listing.source_url ? (
        <a
          href={listing.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-green-800 text-white text-sm rounded-lg py-3 text-center hover:bg-green-900 transition-colors mb-3"
        >
          View on {listing.source}
        </a>
      ) : (
        <div className="w-full bg-stone-200 text-stone-400 text-sm rounded-lg py-3 text-center">Source unavailable</div>
      )}
      <p className="text-xs text-stone-400 text-center">You will be taken to {listing.source} to enquire.</p>
    </div>
  )
}

function EnquiryForm({ listing }: { listing: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 sticky top-6">
      <h3 className="text-sm font-medium text-stone-800 mb-1">Enquire about this property</h3>
      <p className="text-xs text-stone-400 mb-5">Direct listing — no portal fees</p>
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-green-700" placeholder="Your name" />
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-green-700" placeholder="Email address" />
      <input className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-3 outline-none focus:border-green-700" placeholder="Phone number" />
      <textarea className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm mb-4 outline-none focus:border-green-700 min-h-20 resize-none" placeholder="I am interested in arranging a viewing..." />
      <button className="w-full bg-green-800 text-white rounded-lg py-2.5 text-sm hover:bg-green-900 transition-colors">
        Send enquiry
      </button>
      <p className="text-xs text-stone-400 mt-3 text-center">NestLondon does not charge tenants any fees.</p>
    </div>
  )
}
