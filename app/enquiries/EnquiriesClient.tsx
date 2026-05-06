'use client'

import Link from 'next/link'

interface Enquiry {
  id: string
  listing_id: string
  thread_id: string | null
  body: string
  created_at: string
  listings: {
    id: string
    address: string
    price: number | null
    bedrooms: number | null
    property_type: string | null
    borough: string | null
    images: any
    is_active: boolean
    listing_type: string | null
  } | null
}

function getImg(images: any): string | null {
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images || []
    return Array.isArray(arr) ? arr.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EnquiriesClient({ enquiries }: { enquiries: Enquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-12 text-center">
        <h3 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No enquiries yet</h3>
        <p className="text-sm text-[#9B928E] mb-6">When you request details on a property, it'll show up here so you can keep track.</p>
        <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {enquiries.map(e => {
        const l = e.listings
        if (!l) return null
        const img = getImg(l.images)
        const suffix = l.listing_type === 'rent' ? '/mo' : ''
        return (
          <div key={e.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
            <Link href={'/listings/' + l.id} className="no-underline block">
              <div className="h-40 bg-[#F5EBE0] overflow-hidden relative">
                {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center text-[#9B928E]">
                      <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                    </div>}
              </div>
              <div className="p-4">
                <div className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</div>
                <div className="text-xs text-[#9B928E] mt-0.5">
                  {l.price ? '£' + l.price.toLocaleString() + suffix : ''}
                  {l.bedrooms != null ? ' · ' + (l.bedrooms === 0 ? 'Studio' : l.bedrooms + ' bed') : ''}
                  {l.property_type ? ' · ' + l.property_type : ''}
                </div>
              </div>
            </Link>
            <div className="px-4 pb-3 flex items-center justify-between">
              <span className="text-xs text-[#9B928E]">Enquired {formatDate(e.created_at)}</span>
              <Link href={e.thread_id ? '/messages?thread=' + e.thread_id : '/messages'} className="text-xs text-[#D3755A] hover:underline no-underline">
                Message →
              </Link>
            </div>
            <div className="px-4 py-3 border-t border-[#F5F0EB] bg-[#FCFAF7]">
              <Link href={`/listings/${l.id}/offer`}
                className="text-xs text-[#D3755A] hover:underline no-underline">
                Make an offer →
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
