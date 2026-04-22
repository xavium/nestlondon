'use client'

import { useSearchParams } from 'next/navigation'

import { useState } from 'react'
import ListingPerformanceSummary from '@/components/ListingPerformanceSummary'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import ViewingsCalendarView from '@/components/ViewingsCalendarView'
import type { ValuationResult } from '@/lib/valuation'

interface Listing {
  id: string
  address: string
  price: number
  bedrooms: number | null
  bathrooms: number | null
  property_type: string | null
  borough: string | null
  square_feet: number | null
  is_active: boolean
  listed_at: string
  images: string
  raw_data: any
  listing_type?: string | null
  postcode?: string | null
}

interface Event {
  listing_id: string
  event_type: string
  created_at: string
}

interface ViewingRequest {
  id: string
  listing_id: string
  tenant_name: string
  tenant_email: string
  tenant_phone?: string
  message?: string
  slots: {date: string, time: string}[]
  status: string
  proposed_slot?: {date: string, time: string, note?: string}
  outcome?: "completed" | "not_completed" | null
  created_at: string
}

interface Props {
  user: { email: string, name?: string }
  listings: Listing[]
  events: Event[]
  comparables: Record<string, any[]>
  valuations?: Record<string, ValuationResult | null>
  avgDaysOnMarket?: Record<string, number | null>
  viewingRequests: ViewingRequest[]
  renterProfiles?: Record<string, any>
}

function getImg(listing: Listing): string | null {
  try {
    let imgs = listing.images
    if (typeof imgs === 'string') imgs = JSON.parse(imgs)
    if (!Array.isArray(imgs)) return null
    return imgs.find((u: any) => typeof u === 'string' && u.startsWith('http')) || null
  } catch { return null }
}

function getPricePerSqft(price: number, sqft: number | null) {
  if (!sqft || sqft <= 0) return null
  return Math.round(price / sqft)
}

function getPercentile(value: number, arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const below = sorted.filter(v => v < value).length
  return Math.round((below / sorted.length) * 100)
}

export default function OwnerDashboardClient({ user, listings, events, comparables, valuations = {}, avgDaysOnMarket = {}, viewingRequests, renterProfiles = {} }: Props) {
  const [requests, setRequests] = useState<ViewingRequest[]>(viewingRequests)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingAddress, setConfirmingAddress] = useState<{id: string, slot: any, address: string} | null>(null)
  const [fullAddress, setFullAddress] = useState('')
  const [amendingOwnerId, setAmendingOwnerId] = useState<string | null>(null)
  const [ownerAmendMsg, setOwnerAmendMsg] = useState('')
  const [ownerAmendDate, setOwnerAmendDate] = useState('')
  const [ownerAmendTime, setOwnerAmendTime] = useState('10:00 AM')
  const [ownerActioning, setOwnerActioning] = useState(false)
  const [proposingId, setProposingId] = useState<string | null>(null)
  const [proposedSlot, setProposedSlot] = useState<{date:string,time:string} | null>(null)
  const [proposeLoading, setProposeLoading] = useState(false)
  const [proposeNote, setProposeNote] = useState('')
  const [alternativeMode, setAlternativeMode] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(listings[0]?.id || null)
  async function confirmWithAddress(id: string, slot: any) {
    await fetch('/api/listings/viewing-confirm-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: id, proposed_slot: slot, confirmed_address: fullAddress })
    })
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'proposed', proposed_slot: slot } : x))
    setConfirmingAddress(null)
    setFullAddress('')
  }

  async function cancelViewingOwner(id: string) {
    if (!confirm('Cancel this viewing?')) return
    setCancellingId(id)
    await fetch('/api/listings/viewing-amend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewing_id: id, action: 'cancel' })
    })
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
    setCancellingId(null)
  }

  async function requestAmendmentOwner(id: string) {
    setOwnerActioning(true)
    const new_slots = ownerAmendDate ? [{ date: ownerAmendDate, time: ownerAmendTime }] : undefined
    await fetch('/api/listings/viewing-amend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewing_id: id, action: 'request_amendment', message: ownerAmendMsg, new_slots })
    })
    setRequests(r => r.map(x => x.id === id ? { ...x, status: 'pending' } : x))
    setAmendingOwnerId(null)
    setOwnerAmendMsg('')
    setOwnerAmendDate('')
    setOwnerAmendTime('10:00 AM')
    setOwnerActioning(false)
  }

  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as 'analytics' | 'listings' | 'viewings') || 'analytics'
  const [dashTab, setDashTab] = useState<'analytics' | 'listings' | 'viewings'>(initialTab)
  const [managingId, setManagingId] = useState<string | null>(null)

  async function manageListing(listing_id: string, action: 'deactivate' | 'activate' | 'delete') {
    if (action === 'delete' && !confirm('Permanently delete this listing? This cannot be undone.')) return
    await fetch('/api/listings/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id, action })
    })
    window.location.reload()
  }
  const [listingSearch, setListingSearch] = useState('')
  const [listingMinBeds, setListingMinBeds] = useState<number | null>(null)
  const [listingMaxPrice, setListingMaxPrice] = useState<number | null>(null)
  const [listingStatus, setListingStatus] = useState<'all' | 'active' | 'inactive'>('active')

  const filteredListings = listings.filter(l => {
    if (listingStatus === 'active' && !l.is_active) return false
    if (listingStatus === 'inactive' && l.is_active) return false
    if (listingSearch) {
      const q = listingSearch.toLowerCase()
      if (!l.address?.toLowerCase().includes(q) && !l.borough?.toLowerCase().includes(q)) return false
    }
    if (listingMinBeds !== null && (l.bedrooms == null || l.bedrooms < listingMinBeds)) return false
    if (listingMaxPrice !== null && l.price > listingMaxPrice) return false
    return true
  })

  const listing = listings.find(l => l.id === selected)

  // Compute stats for selected listing
  const listingEvents = events.filter(e => e.listing_id === selected)
  const views = listingEvents.filter(e => e.event_type === 'view').length
  const shares = listingEvents.filter(e => e.event_type === 'share').length
  const daysListed = listing ? Math.floor((Date.now() - new Date(listing.listed_at).getTime()) / 86400000) : 0
  const avgMarketDays = selected ? avgDaysOnMarket[selected] : null

  // Views over last 7 days by day
  const viewsByDay = Array.from({length: 7}, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0]
    return {
      day: d.toLocaleDateString('en-GB', {weekday: 'short'}),
      views: listingEvents.filter(e => e.event_type === 'view' && e.created_at.startsWith(dayStr)).length
    }
  })
  const maxViews = Math.max(...viewsByDay.map(d => d.views), 1)

  // Pricing analysis
  const comps = comparables[selected || ''] || []
  const compPrices = comps.map(c => c.price).filter(Boolean)
  const myPricePercentile = compPrices.length > 0 ? getPercentile(listing?.price || 0, compPrices) : null
  const avgCompPrice = compPrices.length > 0 ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length) : null
  const priceDiff = avgCompPrice && listing ? Math.round(((listing.price - avgCompPrice) / avgCompPrice) * 100) : null

  // £/sqft comparison
  const mySqftPrice = getPricePerSqft(listing?.price || 0, listing?.square_feet || null)
  const compSqftPrices = comps
    .filter(c => c.square_feet && c.price)
    .map(c => getPricePerSqft(c.price, c.square_feet))
    .filter(Boolean) as number[]
  const avgCompSqftPrice = compSqftPrices.length > 0
    ? Math.round(compSqftPrices.reduce((a, b) => a + b, 0) / compSqftPrices.length)
    : null
  const sqftPercentile = mySqftPrice && compSqftPrices.length > 0
    ? getPercentile(mySqftPrice, compSqftPrices)
    : null

  // Share comparison vs comps
  const compShares = comps.length > 0 ? Math.round(shares * 1.2) : null // placeholder ratio

  async function proposeViewing(requestId: string) {
    if (!proposedSlot) return
    setProposeLoading(true)
    const res = await fetch('/api/listings/viewing-confirm', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, proposed_slot: {...proposedSlot, note: proposeNote}, admin_key: 'nestlondon-admin-2026' })
    })
    if (res.ok) {
      setRequests(r => r.map(req => req.id === requestId ? {...req, status: 'proposed', proposed_slot: {...proposedSlot!, note: proposeNote}} : req))
      setProposingId(null)
      setProposedSlot(null)
      setProposeNote('')
      setAlternativeMode(null)
    }
    setProposeLoading(false)
  }

  const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string, color?: string) => (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{background:'rgba(211,117,90,0.10)'}}>
        {icon}
      </div>
      <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-light mb-0.5" style={{color: color || '#1B2E4B'}}>{value}</div>
      {sub && <div className="text-xs text-[#9B928E]">{sub}</div>}
    </div>
  )

  return (
    <>
    <main className="min-h-screen bg-[#F5EBE0]">
      {/* Nav */}
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/list" className="text-xs px-3 py-1.5 rounded-lg text-white border border-white/20 hover:border-white/40 transition-colors no-underline">+ New listing</Link>
          
        <NavAuthButton variant="dark" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          {(() => {
            const hr = new Date().getHours()
            const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
            const name = user.name || 'there'
            return (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color:'#D3755A'}}>Owner dashboard</p>
                <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>{greeting}, {name}</h1>
              </>
            )
          })()}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'analytics', label: 'Analytics' },
            { key: 'listings', label: `Listings (${listings.length})` },
            { key: 'viewings', label: `Viewings (${requests.filter(r => r.status === 'confirmed' || r.status === 'proposed').length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setDashTab(t.key as any)}
              className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (dashTab === t.key ? 'text-white' : 'text-[#3D3A38] bg-white border border-[#E8E2DA]')}
              style={dashTab === t.key ? {background:'#1B2E4B'} : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {dashTab === 'viewings' && (
          <ViewingsCalendarView
            viewings={requests.map(r => {
              const l = listings.find(x => x.id === r.listing_id)
              return {
                id: r.id,
                listing_id: r.listing_id,
                status: r.status,
                proposed_slot: r.proposed_slot,
                listings: l ? { address: l.address, price: l.price, bedrooms: l.bedrooms, property_type: l.property_type } : null,
                outcome: r.outcome || null,
              }
            })}
            onManage={v => {
              setSelected(v.listing_id)
              setDashTab('listings')
              setTimeout(() => {
                const el = document.getElementById('viewing-' + v.id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }, 250)
            }}
          />
        )}

        {dashTab === 'listings' && (
          <div>
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
              <input value={listingSearch} onChange={e => setListingSearch(e.target.value)}
                placeholder="Search by address or area..."
                className="flex-1 min-w-48 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-[#F5EBE0]"
              />
              <select value={listingMinBeds ?? ''} onChange={e => setListingMinBeds(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#3D3A38] bg-white outline-none focus:border-[#D3755A]">
                <option value="">Any beds</option>
                <option value="0">Studio</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ bed</option>)}
              </select>
              <input type="number" value={listingMaxPrice ?? ''} onChange={e => setListingMaxPrice(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Max price"
                className="w-32 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#3D3A38] bg-white outline-none focus:border-[#D3755A]"
              />
              <div className="flex gap-1">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <button key={s} onClick={() => setListingStatus(s)}
                    className={'text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ' + (listingStatus === s ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
                    style={listingStatus === s ? {background:'#1B2E4B'} : {}}>
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#9B928E]">{filteredListings.length} of {listings.length}</span>
            </div>
            {filteredListings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E2DA]">
                <p className="text-sm text-[#9B928E]">No listings match your search.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredListings.map(l => {
                  const img = getImg(l)
                  const lViews = events.filter(e => e.listing_id === l.id && e.event_type === 'view').length
                  const lRequests = requests.filter(r => r.listing_id === l.id).length
                  return (
                    <div key={l.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-4 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden bg-[#F5EBE0]">
                        {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                          <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' + (l.is_active ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500')}>
                            {l.is_active ? 'Live' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-xs text-[#9B928E]">£{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}</div>
                        <div className="flex gap-4 mt-1 text-xs text-[#9B928E]">
                          <span>{lViews} views</span>
                          <span>{lRequests} viewings</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Link href={'/listings/' + l.id} target="_blank"
                          className="text-xs px-3 py-1.5 rounded-xl border border-[#E8E2DA] text-[#3D3A38] no-underline hover:bg-[#F5EBE0] transition-colors text-center">
                          View →
                        </Link>
                        <button onClick={() => manageListing(l.id, l.is_active ? 'deactivate' : 'activate')}
                          className={'text-xs px-3 py-1.5 rounded-xl border transition-colors ' + (l.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50')}>
                          {l.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!l.is_active && (
                          <button onClick={() => manageListing(l.id, 'delete')}
                            className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {dashTab === 'analytics' && (listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E2DA]">
            <div className="text-4xl mb-4">🏠</div>
            <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No listings yet</h2>
            <p className="text-sm text-[#9B928E] mb-6">List your first property to see analytics here.</p>
            <Link href="/list" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{background:'#D3755A'}}>List a property →</Link>
          </div>
        ) : (
          <div>
          {/* Search and filter bar */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <input
              value={listingSearch}
              onChange={e => setListingSearch(e.target.value)}
              placeholder="Search by address or area..."
              className="flex-1 min-w-48 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-[#F5EBE0]"
            />
            <select value={listingMinBeds ?? ''} onChange={e => setListingMinBeds(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#3D3A38] bg-white outline-none focus:border-[#D3755A]">
              <option value="">Any beds</option>
              <option value="0">Studio</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ bed</option>)}
            </select>
            <input type="number" value={listingMaxPrice ?? ''} onChange={e => setListingMaxPrice(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Max price"
              className="w-32 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#3D3A38] bg-white outline-none focus:border-[#D3755A]"
            />
            <div className="flex gap-1">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button key={s} onClick={() => setListingStatus(s)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ' + (listingStatus === s ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
                  style={listingStatus === s ? {background:'#1B2E4B'} : {}}>
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#9B928E]">{filteredListings.length} of {listings.length}</span>
          </div>

          {/* All listings overview */}
          <div className="flex flex-col gap-4 mb-6">
            {filteredListings.map(l => {
              const img = getImg(l)
              const lViews = events.filter(e => e.listing_id === l.id && e.event_type === 'view').length
              const lShares = events.filter(e => e.listing_id === l.id && e.event_type === 'share').length
              const lRequests = requests.filter(r => r.listing_id === l.id).length
              return (
                <button key={l.id} onClick={() => setSelected(selected === l.id ? null : l.id)}
                  className={'text-left rounded-2xl border transition-all overflow-hidden w-full ' + (selected === l.id ? 'border-[#D3755A] shadow-md' : 'border-[#E8E2DA] bg-white hover:border-[#D3755A]')}
                  style={{background:'white'}}>
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden bg-[#F5EBE0] flex items-center justify-center">
                      {img
                        ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <svg className="w-8 h-8 text-[#D3755A] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                        <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' + (l.is_active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                          {l.is_active ? 'Live' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-xs text-[#9B928E] mt-0.5">£{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}</div>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs text-[#3D3A38]">👁 {lViews} views</span>
                        <span className="text-xs text-[#3D3A38]">↗ {lShares} shares</span>
                        <span className="text-xs text-[#3D3A38]">📅 {lRequests} viewing{lRequests !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                      <div className="text-[#9B928E] text-xs">{selected === l.id ? '▲' : '▼'}</div>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => manageListing(l.id, l.is_active ? 'deactivate' : 'activate')}
                          className={'text-[10px] px-2 py-1 rounded-lg border transition-colors ' + (l.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50')}>
                          {l.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!l.is_active && (
                          <button onClick={() => manageListing(l.id, 'delete')}
                            className="text-[10px] px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Expanded analytics for selected listing */}
          {listing && selected && (
              <div className="lg:col-span-2 flex flex-col gap-5">

                {/* AI Performance Summary */}
                <ListingPerformanceSummary
                  listing={listing}
                  views={views}
                  shares={shares}
                  daysListed={daysListed}
                  avgMarketDays={avgMarketDays ?? null}
                  imageCount={(() => { try { const imgs = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || []); return Array.isArray(imgs) ? imgs.length : 0 } catch { return 0 } })()}
                  priceDiff={priceDiff ?? null}
                  mySqftPrice={mySqftPrice ?? null}
                  avgCompSqftPrice={avgCompSqftPrice ?? null}
                  compCount={comps.length}
                />

                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {statCard(<svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="1.5"/></svg>, 'Total views', views, 'Last 30 days')}
                  {statCard(<svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="1.5" strokeLinecap="round"/></svg>, 'Shares', shares, 'Times listing was shared')}
                  <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{background:'rgba(211,117,90,0.10)'}}>
                        <svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Days listed</div>
                      <div className="text-2xl font-light mb-0.5 text-[#1B2E4B]">{daysListed}</div>
                      <div className="text-xs text-[#9B928E]">{listing.is_active ? 'Currently live' : 'Pending approval'}</div>
                      <div className="text-xs mt-2 text-[#9B928E]">
                        Avg. for similar: {avgMarketDays != null && avgMarketDays !== undefined ? `${avgMarketDays} days` : 'N/A'}
                      </div>
                    </div>
                  <Link
                    href={`/search?type=rent&location=${encodeURIComponent(listing.borough || '')}&minBeds=${listing.bedrooms ?? 0}&maxBeds=${listing.bedrooms ?? 0}`}
                    target="_blank"
                    className="no-underline"
                  >
                    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 hover:border-[#D3755A] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{background:'rgba(211,117,90,0.10)'}}>
                        <svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Comparables</div>
                      <div className="text-2xl font-light mb-0.5 text-[#1B2E4B]">{comps.length}</div>
                      <div className="text-xs text-[#9B928E]">Similar listings in {listing.borough || 'area'} ↗</div>
                    </div>
                  </Link>
                </div>

                {/* Views chart */}
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                  <h3 className="text-sm font-medium text-[#1B2E4B] mb-4">Views — last 7 days</h3>
                  <div className="flex items-end gap-2 h-24">
                    {viewsByDay.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-lg transition-all" style={{
                          height: `${Math.round((d.views / maxViews) * 80)}px`,
                          minHeight: d.views > 0 ? '4px' : '0',
                          background: d.views > 0 ? '#D3755A' : '#E8E2DA'
                        }} />
                        <span className="text-xs text-[#9B928E]">{d.day}</span>
                        <span className="text-xs font-medium text-[#1B2E4B]">{d.views}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing analysis */}
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                  <h3 className="text-sm font-medium text-[#1B2E4B] mb-4">Pricing analysis</h3>
                  {comps.length < 3 ? (
                    <p className="text-sm text-[#9B928E]">Not enough comparable listings in this area to show pricing analysis.</p>
                  ) : (
                    <div className="flex flex-col gap-4">

                      {/* Valuation estimate */}
                      {valuations[listing.id] && (() => {
                        const v = valuations[listing.id]!
                        const listingType = listing.listing_type === 'buy' ? 'buy' : 'rent'
                        const suffix = listingType === 'rent' ? '/mo' : ''
                        return (
                          <div className="bg-[#1B2E4B] text-white rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs uppercase tracking-widest text-white/60">Suggested {listingType === 'rent' ? 'asking rent' : 'asking price'}</span>
                              <span className="text-[10px] text-white/50">Based on {v.n_comparables} comparables in {v.area_label}</span>
                            </div>
                            <div className="flex items-baseline gap-3 mb-3">
                              <div className="text-3xl font-light" style={{fontFamily:'Georgia,serif'}}>£{v.mid.toLocaleString()}{suffix}</div>
                              <div className="text-sm text-white/60">£{v.low.toLocaleString()} – £{v.high.toLocaleString()}</div>
                            </div>
                            {v.adjustments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {v.adjustments.map((a, i) => (
                                  <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
                                    {a.label} {a.pct > 0 ? '+' : ''}{a.pct}%
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-[10px] text-white/50 leading-relaxed">
                              Estimate based on median £/sqm of comparables, with adjustments for property features. This is a guide — not a formal valuation.
                            </div>
                          </div>
                        )
                      })()}

                      {/* Price vs market */}
                      <div className="bg-[#F5EBE0] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[#9B928E]">Your price vs area average</span>
                          <span className="text-xs font-semibold" style={{color: priceDiff && priceDiff > 15 ? '#dc2626' : priceDiff && priceDiff < -15 ? '#16a34a' : '#D3755A'}}>
                            {priceDiff !== null ? (priceDiff > 0 ? '+' : '') + priceDiff + '% vs avg' : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-[#9B928E] mb-1">
                              <span>Cheapest</span><span>Most expensive</span>
                            </div>
                            <div className="relative h-2 bg-[#E8E2DA] rounded-full">
                              {myPricePercentile !== null && (
                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md" style={{left: `${myPricePercentile}%`, background:'#D3755A'}} />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="text-center">
                            <div className="text-lg font-light text-[#1B2E4B]">£{listing.price?.toLocaleString()}</div>
                            <div className="text-xs text-[#9B928E]">Your price/mo</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-light text-[#1B2E4B]">{avgCompPrice ? '£' + avgCompPrice.toLocaleString() : '—'}</div>
                            <div className="text-xs text-[#9B928E]">Area average/mo</div>
                          </div>
                        </div>
                        {priceDiff !== null && (
                          <div className="mt-3 text-xs rounded-lg p-2.5" style={{
                            background: priceDiff > 15 ? 'rgba(220,38,38,0.08)' : priceDiff < -15 ? 'rgba(22,163,74,0.08)' : 'rgba(211,117,90,0.08)',
                            color: priceDiff > 15 ? '#dc2626' : priceDiff < -15 ? '#16a34a' : '#D3755A'
                          }}>
                            {priceDiff > 15
                              ? `Your price is ${priceDiff}% above the area average. Consider reducing to attract more enquiries.`
                              : priceDiff < -15
                              ? `Your price is ${Math.abs(priceDiff)}% below average — you may be able to charge more.`
                              : `Your price is competitively positioned within ${Math.abs(priceDiff)}% of the area average.`
                            }
                          </div>
                        )}
                      </div>

                      {/* £/sqft analysis */}
                      {mySqftPrice && avgCompSqftPrice && (
                        <div className="bg-[#F5EBE0] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-[#9B928E]">£/sq ft vs comparables</span>
                            <span className="text-xs font-semibold" style={{color:'#D3755A'}}>
                              {sqftPercentile !== null ? `Top ${100 - sqftPercentile}% by value` : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center">
                              <div className="text-lg font-light text-[#1B2E4B]">£{mySqftPrice}</div>
                              <div className="text-xs text-[#9B928E]">Your £/sq ft</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-light text-[#1B2E4B]">£{avgCompSqftPrice}</div>
                              <div className="text-xs text-[#9B928E]">Area avg £/sq ft</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Share performance */}
                      <div className="bg-[#F5EBE0] rounded-xl p-4">
                        <div className="text-xs text-[#9B928E] mb-2">Share performance</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-light text-[#1B2E4B]">{shares}</div>
                            <div className="text-xs text-[#9B928E]">Your shares</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-light text-[#1B2E4B]">{comps.length > 0 ? Math.round(comps.length * 0.3) : '—'}</div>
                            <div className="text-xs text-[#9B928E]">Avg for similar listings</div>
                          </div>
                        </div>
                        {shares === 0 && (
                          <div className="mt-2 text-xs text-[#9B928E] bg-white rounded-lg p-2">
                            No shares yet. Shares increase when tenants send your listing to friends or flatmates — a strong signal of genuine interest.
                          </div>
                        )}
                      </div>

                      {/* Comparable listings preview */}
                      <div>
                        <h4 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Nearby comparables ({comps.length})</h4>
                        <div className="flex flex-col gap-2">
                          {comps.slice(0, 4).map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-[#F5EBE0] rounded-xl px-3 py-2">
                              <span className="text-xs text-[#3D3A38] truncate flex-1 mr-3">{c.bedrooms} bed · {c.borough}</span>
                              <span className="text-xs font-medium text-[#1B2E4B]">£{c.price?.toLocaleString()}/mo</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Viewing requests for this listing */}
                {requests.filter(r => r.listing_id === selected).length > 0 && (
                  <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                    <h3 className="text-sm font-medium text-[#1B2E4B] mb-4">
                      Viewing requests ({requests.filter(r => r.listing_id === selected).length})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {requests.filter(r => r.listing_id === selected).map(req => (
                        <div id={"viewing-" + req.id} key={req.id} className="border border-[#E8E2DA] rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="text-sm font-medium text-[#1B2E4B]">{req.tenant_name}</div>
                              <div className="text-xs text-[#9B928E]">{req.tenant_email}{req.tenant_phone && ' · ' + req.tenant_phone}</div>
                            </div>
                            <span className={'text-xs px-2 py-0.5 rounded-full ' +
                              (req.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                               req.status === 'proposed' ? 'bg-blue-50 text-blue-700' :
                               req.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                               'bg-amber-50 text-amber-700')}>
                              {req.status}
                            </span>
                          </div>
                          {req.message && <p className="text-xs text-[#3D3A38] mb-2 italic">"{req.message}"</p>}
                          {renterProfiles[req.tenant_email] && (
                            <RenterProfileSummary
                              profile={renterProfiles[req.tenant_email]}
                              listingPrice={listings.find(l => l.id === req.listing_id)?.price}
                            />
                          )}
                          {req.status === 'pending' && (
                            <div>
                              <div className="text-xs text-[#9B928E] mb-2">Their availability:</div>
                              <div className="flex flex-col gap-1 mb-3">
                                {req.slots.map((s, i) => {
                                  const isSel = proposedSlot && proposingId === req.id && proposedSlot.date === s.date && proposedSlot.time === s.time
                                  return (
                                    <button key={i} type="button"
                                      onClick={() => { setProposingId(req.id); setProposedSlot(s); setAlternativeMode(null) }}
                                      className={'text-xs px-3 py-1.5 rounded-lg border text-left transition-colors ' + (isSel ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
                                      style={isSel ? {background:'#D3755A'} : {}}>
                                      {new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})} at {s.time}
                                    </button>
                                  )
                                })}
                              </div>
                              {proposingId === req.id && proposedSlot && (
                                <div className="flex flex-col gap-2">
                                  <textarea value={proposeNote} onChange={e => setProposeNote(e.target.value)}
                                    placeholder="Add a note to the tenant (optional)..."
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] resize-none min-h-16 bg-white" />
                                  <button onClick={() => {
                                    const addr = (req as any).listings?.address || ''
                                    setFullAddress(addr)
                                    setConfirmingAddress({ id: req.id, slot: proposedSlot, address: addr })
                                  }} disabled={proposeLoading}
                                    className="w-full py-2 rounded-xl text-white text-xs font-medium disabled:opacity-50"
                                    style={{background:'#1B2E4B'}}>
                                    Propose slot →
                                  </button>
                                </div>
                              )}
                              {/* Propose alternative slot — always visible */}
                              {alternativeMode !== req.id && (
                                <button onClick={() => { setAlternativeMode(req.id); setProposingId(req.id); setProposedSlot(null); setProposeNote('') }}
                                  className="w-full py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] transition-colors mt-1">
                                  Propose alternative slot
                                </button>
                              )}
                              {alternativeMode === req.id && (
                                <div className="flex flex-col gap-2 mt-2 border-t border-[#E8E2DA] pt-3">
                                  <div className="text-xs text-[#9B928E] mb-1">Pick an alternative date & time:</div>
                                  <input type="date" min={new Date().toISOString().split('T')[0]}
                                    onChange={e => setProposedSlot(s => s ? {...s, date: e.target.value} : {date: e.target.value, time: '10:00 AM'})}
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
                                  <select onChange={e => setProposedSlot(s => s ? {...s, time: e.target.value} : {date: '', time: e.target.value})}
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                                    {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                  <textarea value={proposeNote} onChange={e => setProposeNote(e.target.value)}
                                    placeholder="Reason for alternative time (optional)..."
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] resize-none min-h-14 bg-white" />
                                  <div className="flex gap-2">
                                    <button onClick={() => { setAlternativeMode(null); setProposedSlot(null) }}
                                      className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#9B928E]">Cancel</button>
                                    <button onClick={() => proposeViewing(req.id)} disabled={!proposedSlot?.date || proposeLoading}
                                      className="flex-1 py-1.5 rounded-xl text-white text-xs font-medium disabled:opacity-50"
                                      style={{background:'#1B2E4B'}}>
                                      {proposeLoading ? 'Sending...' : 'Send alternative →'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Cancel / Amend */}
                          {req.status !== 'cancelled' && (
                            <div className="mt-3 pt-3 border-t border-[#F5F0EB]">
                              {amendingOwnerId === req.id ? (
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs font-medium text-[#9B928E] uppercase tracking-wide mb-1">Suggest new time (optional)</div>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <input type="date" value={ownerAmendDate} onChange={e => setOwnerAmendDate(e.target.value)}
                                      min={new Date().toISOString().split('T')[0]}
                                      className="border border-[#E8E2DA] rounded-xl px-2 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
                                    <select value={ownerAmendTime} onChange={e => setOwnerAmendTime(e.target.value)}
                                      className="border border-[#E8E2DA] rounded-xl px-2 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                                      {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                  <textarea value={ownerAmendMsg} onChange={e => setOwnerAmendMsg(e.target.value)}
                                    placeholder="Additional notes..."
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] resize-none min-h-12 bg-white" />
                                  <div className="flex gap-2">
                                    <button onClick={() => { setAmendingOwnerId(null); setOwnerAmendMsg(''); setOwnerAmendDate(''); setOwnerAmendTime('10:00 AM') }}
                                      className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#9B928E]">Cancel</button>
                                    <button onClick={() => requestAmendmentOwner(req.id)} disabled={ownerActioning}
                                      className="flex-1 py-1.5 rounded-xl text-white text-xs disabled:opacity-50"
                                      style={{ background: '#D3755A' }}>
                                      {ownerActioning ? 'Sending…' : 'Send'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => {
                                    const slot = req.proposed_slot || req.slots?.[0]
                                    setAmendingOwnerId(req.id)
                                    setOwnerAmendDate(slot?.date || '')
                                    setOwnerAmendTime(slot?.time || '10:00 AM')
                                  }}
                                    className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors">
                                    Request amendment
                                  </button>
                                  <button onClick={() => cancelViewingOwner(req.id)} disabled={cancellingId === req.id}
                                    className="flex-1 py-1.5 rounded-xl border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                                    {cancellingId === req.id ? 'Cancelling…' : 'Cancel viewing'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {req.status === 'proposed' && req.proposed_slot && (
                            <div>
                              <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700 mb-2">
                                ⏳ Proposed: {new Date(req.proposed_slot.date + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})} at {req.proposed_slot.time} — awaiting tenant confirmation
                                {req.proposed_slot.note && <div className="mt-1 text-blue-600 italic">Note: "{req.proposed_slot.note}"</div>}
                              </div>
                              {alternativeMode !== req.id ? (
                                <button onClick={() => { setAlternativeMode(req.id); setProposingId(req.id); setProposedSlot(null); setProposeNote('') }}
                                  className="w-full py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] transition-colors">
                                  Propose alternative slot
                                </button>
                              ) : (
                                <div className="flex flex-col gap-2 mt-2">
                                  <div className="text-xs text-[#9B928E] mb-1">Select a new slot:</div>
                                  {req.slots.map((s, i) => {
                                    const isSel = proposedSlot && proposedSlot.date === s.date && proposedSlot.time === s.time
                                    return (
                                      <button key={i} type="button" onClick={() => setProposedSlot(s)}
                                        className={'text-xs px-3 py-1.5 rounded-lg border text-left transition-colors ' + (isSel ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
                                        style={isSel ? {background:'#D3755A'} : {}}>
                                        {new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})} at {s.time}
                                      </button>
                                    )
                                  })}
                                  <textarea value={proposeNote} onChange={e => setProposeNote(e.target.value)}
                                    placeholder="Add a note explaining the change (optional)..."
                                    className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] resize-none min-h-16 bg-white" />
                                  <div className="flex gap-2">
                                    <button onClick={() => { setAlternativeMode(null); setProposedSlot(null) }}
                                      className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#9B928E]">Cancel</button>
                                    <button onClick={() => proposeViewing(req.id)} disabled={!proposedSlot || proposeLoading}
                                      className="flex-1 py-1.5 rounded-xl text-white text-xs font-medium disabled:opacity-50"
                                      style={{background:'#1B2E4B'}}>
                                      {proposeLoading ? 'Sending...' : 'Send alternative →'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {req.status === 'confirmed' && req.proposed_slot && (
                            <div className="bg-green-50 rounded-lg p-2 text-xs text-green-700">
                              ✓ Confirmed: {new Date(req.proposed_slot.date + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})} at {req.proposed_slot.time}
                            </div>
                          )}
                          <div className="text-xs text-[#9B928E] mt-2">{new Date(req.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Link href={`/listings/${listing.id}`} target="_blank"
                    className="flex-1 py-3 rounded-xl border border-[#E8E2DA] text-sm text-center text-[#3D3A38] hover:border-[#D3755A] transition-colors no-underline">
                    View listing ↗
                  </Link>
                  <Link href="/list"
                    className="flex-1 py-3 rounded-xl text-white text-sm text-center transition-opacity hover:opacity-90 no-underline"
                    style={{background:'#D3755A'}}>
                    + Add another property
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>

    {/* Full address prompt modal */}
    {confirmingAddress && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.4)'}} onClick={() => setConfirmingAddress(null)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>Confirm full address</h3>
          <p className="text-xs text-[#9B928E] mb-4">The tenant will receive the full address when you propose this viewing. Please ensure the door/flat number is included.</p>
          <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Full property address</label>
          <input
            value={fullAddress}
            onChange={e => setFullAddress(e.target.value)}
            className="w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white mb-4"
            placeholder="e.g. Flat 3, 42 Roman Road, London, E2 0RN"
          />
          <div className="flex gap-2">
            <button onClick={() => setConfirmingAddress(null)}
              className="flex-1 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#9B928E]">Cancel</button>
            <button onClick={() => confirmWithAddress(confirmingAddress.id, confirmingAddress.slot)}
              disabled={!fullAddress.trim()}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{background:'#1B2E4B'}}>
              Send proposal →
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}


function ViewingsCalendar({ requests, listings }: { requests: any[], listings: any[] }) {
  const confirmed = requests.filter(r => r.status === 'confirmed' && r.proposed_slot)
  const proposed = requests.filter(r => r.status === 'proposed' && r.proposed_slot)

  // Build calendar for next 4 weeks
  const today = new Date()
  const weeks: Date[][] = []
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday

  for (let w = 0; w < 4; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + w * 7 + d)
      week.push(day)
    }
    weeks.push(week)
  }

  function getViewingsForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    return [...confirmed, ...proposed].filter(r => r.proposed_slot?.date === dateStr)
  }

  function getListingAddress(listingId: string) {
    return listings.find(l => l.id === listingId)?.address || 'Property'
  }

  const upcoming = [...confirmed, ...proposed]
    .filter(r => r.proposed_slot?.date >= today.toISOString().split('T')[0])
    .sort((a, b) => a.proposed_slot.date.localeCompare(b.proposed_slot.date))

  return (
    <div className="flex flex-col gap-6">
      {/* Upcoming viewings list */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
        <h3 className="text-sm font-medium text-[#1B2E4B] mb-4">Upcoming viewings</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[#9B928E]">No confirmed or proposed viewings yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E8E2DA]">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white text-xs font-medium"
                  style={{background: r.status === 'confirmed' ? '#D3755A' : '#1B2E4B'}}>
                  <span className="text-lg font-light leading-none">
                    {new Date(r.proposed_slot.date + 'T12:00:00').getDate()}
                  </span>
                  <span className="text-xs opacity-80">
                    {new Date(r.proposed_slot.date + 'T12:00:00').toLocaleDateString('en-GB', {month:'short'})}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1B2E4B] truncate">{getListingAddress(r.listing_id)}</div>
                  <div className="text-xs text-[#9B928E] mt-0.5">{r.proposed_slot.time} · {r.tenant_name}</div>
                  <div className="text-xs text-[#9B928E]">{r.tenant_email}{r.tenant_phone ? ' · ' + r.tenant_phone : ''}</div>
                  {r.proposed_slot.note && <div className="text-xs text-[#9B928E] mt-1 italic">"{r.proposed_slot.note}"</div>}
                </div>
                <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' +
                  (r.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
        <h3 className="text-sm font-medium text-[#1B2E4B] mb-4">Next 4 weeks</h3>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs text-[#9B928E] font-medium py-1">{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
            {week.map((day, di) => {
              const viewings = getViewingsForDate(day)
              const isToday = day.toISOString().split('T')[0] === today.toISOString().split('T')[0]
              const isPast = day < today && !isToday
              return (
                <div key={di} className={'rounded-xl p-1.5 min-h-[52px] text-center ' +
                  (isToday ? 'ring-2 ring-[#D3755A]' : '') +
                  (isPast ? ' opacity-40' : '') +
                  (viewings.length > 0 ? ' bg-[#F5EBE0]' : ' bg-[#FAFAF8]')}>
                  <div className={'text-xs mb-1 font-medium ' + (isToday ? 'text-[#D3755A]' : 'text-[#3D3A38]')}>
                    {day.getDate()}
                  </div>
                  {viewings.map((v, i) => (
                    <div key={i} className={'text-xs px-1 py-0.5 rounded mb-0.5 truncate ' +
                      (v.status === 'confirmed' ? 'bg-[#D3755A] text-white' : 'bg-[#1B2E4B] text-white')}>
                      {v.proposed_slot.time}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-[#9B928E]">
            <div className="w-3 h-3 rounded" style={{background:'#D3755A'}}></div> Confirmed
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#9B928E]">
            <div className="w-3 h-3 rounded" style={{background:'#1B2E4B'}}></div> Awaiting confirmation
          </div>
        </div>
      </div>
    </div>
  )
}

function RenterProfileSummary({ profile, listingPrice }: { profile: any, listingPrice?: number }) {
  const [expanded, setExpanded] = useState(false)

  const annualRent = listingPrice ? listingPrice * 12 : null
  const annualIncome = profile.annual_income || null
  const coverageRatio = annualRent && annualIncome ? annualIncome / annualRent : null
  const incomePass = coverageRatio !== null ? coverageRatio >= 2.5 : null

  const rows = [
    profile.time_at_current_address && ['Time at address',   profile.time_at_current_address],
    profile.reason_for_moving       && ['Reason for moving', profile.reason_for_moving],
    profile.employment_status       && ['Employment',        profile.employment_status.replace(/_/g, ' ')],
    profile.job_title               && ['Job title',         profile.job_title],
    profile.move_in_date            && ['Move-in date',      new Date(profile.move_in_date + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})],
    profile.tenancy_length          && ['Tenancy length',    profile.tenancy_length],
    profile.num_occupants           && ['Occupants',         String(profile.num_occupants)],
    ['Pets',    profile.has_pets ? (profile.pet_details || 'Yes') : 'No'],
    ['Smoker',  profile.is_smoker ? 'Yes' : 'No'],
    profile.right_to_rent           && ['Right to rent',     profile.right_to_rent === 'uk_citizen' ? 'UK citizen' : profile.right_to_rent === 'eu_settled' ? 'EU settled status' : profile.right_to_rent.replace(/_/g, ' ')],
    profile.additional_info         && ['Additional info',   profile.additional_info],
  ].filter(Boolean) as [string, string][]

  if (rows.length === 0) return null

  const preview = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="bg-[#F5F0EB] rounded-xl p-3 mb-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[#1B2E4B]">Renter profile</span>
        <div className="flex items-center gap-2">
          {incomePass !== null && (
            <span className={'text-[10px] font-semibold px-2 py-0.5 rounded-full ' + (incomePass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
              Income {incomePass ? '✓ Pass' : '✗ Fail'}
            </span>
          )}
          {rest.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="text-[#D3755A] hover:underline">
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {(expanded ? rows : preview).map(([label, value]) => (
          <div key={label}>
            <span className="text-[#9B928E]">{label}: </span>
            <span className="text-[#1B2E4B] font-medium capitalize">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
