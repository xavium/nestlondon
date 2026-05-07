'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Offer {
  id: string
  listing_id: string
  offer_type: 'rent' | 'buy'
  offer_amount: number
  status: string
  status_reason: string | null
  created_at: string
  listings: {
    id: string
    address: string
    price: number | null
    bedrooms: number | null
    property_type: string | null
    borough: string | null
    images: any
    listing_type: string | null
    is_active: boolean
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  new:       { label: 'Submitted', bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200' },
  viewed:    { label: 'Viewed',    bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
  accepted:  { label: 'Accepted',  bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-stone-100', text: 'text-stone-500', border: 'border-stone-200' },
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

function formatMoney(n: number | null | undefined, suffix = '') {
  if (n == null) return '—'
  return '£' + n.toLocaleString() + suffix
}

export default function OffersClient({ offers, threadByListing = {} }: { offers: Offer[]; threadByListing?: Record<string, string> }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')

  const filtered = offers.filter(o => {
    if (filter === 'all') return true
    if (filter === 'pending') return o.status === 'new' || o.status === 'viewed'
    return o.status === filter
  })

  if (offers.length === 0) {
    return (
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-12 text-center">
        <h3 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No offers yet</h3>
        <p className="text-sm text-[#9B928E] mb-6">When you submit an offer on a property, you'll be able to track its status here.</p>
        <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {([
          { key: 'all',      label: `All (${offers.length})` },
          { key: 'pending',  label: `Awaiting response (${offers.filter(o => o.status === 'new' || o.status === 'viewed').length})` },
          { key: 'accepted', label: `Accepted (${offers.filter(o => o.status === 'accepted').length})` },
          { key: 'rejected', label: `Rejected (${offers.filter(o => o.status === 'rejected').length})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (filter === f.key ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
            style={filter === f.key ? {background:'#1B2E4B'} : {}}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(o => {
          const l = o.listings
          const img = l ? getImg(l.images) : null
          const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.new
          const suffix = o.offer_type === 'rent' ? '/mo' : ''
          return (
            <div key={o.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
              {l && (
                <Link href={'/listings/' + l.id} className="no-underline block">
                  <div className="h-40 bg-[#F5EBE0] overflow-hidden relative">
                    {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-[#9B928E]">
                          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                        </div>}
                    <span className={'absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full border ' + cfg.bg + ' ' + cfg.text + ' ' + cfg.border}>{cfg.label}</span>
                  </div>
                  <div className="p-4">
                    <div className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</div>
                    <div className="text-xs text-[#9B928E] mt-0.5">
                      Asking {formatMoney(l.price, suffix)}
                      {l.bedrooms != null ? ' · ' + (l.bedrooms === 0 ? 'Studio' : l.bedrooms + ' bed') : ''}
                    </div>
                  </div>
                </Link>
              )}
              <div className="px-4 py-3 border-t border-[#F5F0EB] bg-[#FCFAF7] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9B928E]">Your offer</div>
                  <div className="text-sm font-medium text-[#1B2E4B]">{formatMoney(o.offer_amount, suffix)}</div>
                </div>
                <div className="text-xs text-[#9B928E] text-right">
                  Submitted<br />{formatDate(o.created_at)}
                </div>
              </div>
              {threadByListing[o.listing_id] && (
                <div className="px-4 py-2 border-t border-[#F5F0EB]">
                  <Link href={'/messages?thread=' + threadByListing[o.listing_id]}
                    className="text-xs text-[#D3755A] hover:underline no-underline">
                    Message owner →
                  </Link>
                </div>
              )}
              {o.status === 'rejected' && o.status_reason && (
                <div className="px-4 py-2.5 border-t border-[#F5F0EB] bg-[#FEF6F4]">
                  <div className="text-xs text-[#9B928E] mb-0.5">Reason</div>
                  <div className="text-xs text-[#3D3A38] leading-relaxed">{o.status_reason}</div>
                </div>
              )}
              {o.status === 'rejected' && l?.is_active && (
                <div className="px-4 py-2 border-t border-[#F5F0EB]">
                  <Link href={'/listings/' + o.listing_id + '/offer'}
                    className="text-xs text-[#D3755A] hover:underline no-underline font-medium">
                    Submit a new offer →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
