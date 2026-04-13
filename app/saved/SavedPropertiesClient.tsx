'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SavedProperty {
  id: string
  created_at: string
  listing_id: string
  listings: {
    id: string
    address: string
    price: number
    bedrooms: number | null
    bathrooms: number | null
    property_type: string | null
    borough: string | null
    images: string
    is_active: boolean
  } | null
}

function getImg(images: string): string | null {
  try {
    const imgs = typeof images === 'string' ? JSON.parse(images) : (images || [])
    return Array.isArray(imgs) ? imgs.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

export default function SavedPropertiesClient({ savedProperties }: { savedProperties: SavedProperty[] }) {
  const [props, setProps] = useState(savedProperties)

  async function unsave(savedId: string) {
    await fetch('/api/saved/property', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_id: savedId })
    })
    setProps(p => p.filter(x => x.id !== savedId))
  }

  if (props.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
        <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No saved properties yet</h2>
      <p className="text-sm text-[#9B928E] mb-6">Heart a property on the search or listing page to save it here.</p>
      <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {props.map(p => {
        const l = p.listings
        if (!l) return null
        const img = getImg(l.images)
        return (
          <div key={p.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
            <Link href={`/listings/${l.id}`} className="no-underline block">
              <div className="h-40 bg-[#F5EBE0] overflow-hidden">
                {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center text-[#9B928E]">
                      <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                    </div>}
              </div>
              <div className="p-4">
                <div className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</div>
                <div className="text-xs text-[#9B928E] mt-0.5">
                  £{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}
                </div>
              </div>
            </Link>
            <div className="px-4 pb-4 flex items-center justify-between">
              <span className="text-xs text-[#9B928E]">Saved {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              <button onClick={() => unsave(p.id)} className="text-xs text-[#9B928E] hover:text-red-500 transition-colors">Remove ×</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
