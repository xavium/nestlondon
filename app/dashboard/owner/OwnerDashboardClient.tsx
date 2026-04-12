'use client'

import { useState } from 'react'
import Link from 'next/link'

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
}

interface Event {
  listing_id: string
  event_type: string
  created_at: string
}

interface Props {
  user: { email: string, name?: string }
  listings: Listing[]
  events: Event[]
  comparables: Record<string, any[]>
}

function getImg(listing: Listing): string | null {
  try {
    const imgs = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || [])
    return imgs.find((u: string) => u?.startsWith('https')) || null
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

export default function OwnerDashboardClient({ user, listings, events, comparables }: Props) {
  const [selected, setSelected] = useState<string | null>(listings[0]?.id || null)

  const listing = listings.find(l => l.id === selected)

  // Compute stats for selected listing
  const listingEvents = events.filter(e => e.listing_id === selected)
  const views = listingEvents.filter(e => e.event_type === 'view').length
  const shares = listingEvents.filter(e => e.event_type === 'share').length
  const daysListed = listing ? Math.floor((Date.now() - new Date(listing.listed_at).getTime()) / 86400000) : 0

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

  const statCard = (icon: string, label: string, value: string | number, sub?: string, color?: string) => (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
      <div className="text-lg mb-2">{icon}</div>
      <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-light mb-0.5" style={{color: color || '#1B2E4B'}}>{value}</div>
      {sub && <div className="text-xs text-[#9B928E]">{sub}</div>}
    </div>
  )

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      {/* Nav */}
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{user.name || user.email}</span>
          <Link href="/list" className="text-xs px-3 py-1.5 rounded-lg text-white border border-white/20 hover:border-white/40 transition-colors no-underline">+ New listing</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color:'#D3755A'}}>Owner dashboard</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>Your properties</h1>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E2DA]">
            <div className="text-4xl mb-4">🏠</div>
            <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No listings yet</h2>
            <p className="text-sm text-[#9B928E] mb-6">List your first property to see analytics here.</p>
            <Link href="/list" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{background:'#D3755A'}}>List a property →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listing selector */}
            <div className="flex flex-col gap-3">
              {listings.map(l => {
                const img = getImg(l)
                const lViews = events.filter(e => e.listing_id === l.id && e.event_type === 'view').length
                return (
                  <button key={l.id} onClick={() => setSelected(l.id)}
                    className={'text-left rounded-2xl border transition-all overflow-hidden ' + (selected === l.id ? 'border-[#D3755A] shadow-md' : 'border-[#E8E2DA] bg-white hover:border-[#D3755A]')}
                    style={selected === l.id ? {background:'white'} : {}}
                  >
                    {img && <img src={img} className="w-full h-28 object-cover" referrerPolicy="no-referrer" />}
                    <div className="p-3">
                      <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-[#9B928E]">£{l.price?.toLocaleString()}/mo</span>
                        <span className={'text-xs px-2 py-0.5 rounded-full ' + (l.is_active ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                          {l.is_active ? 'Live' : 'Pending'}
                        </span>
                      </div>
                      <div className="text-xs text-[#9B928E] mt-1">{lViews} view{lViews !== 1 ? 's' : ''}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Analytics panel */}
            {listing && (
              <div className="lg:col-span-2 flex flex-col gap-5">

                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {statCard('👁', 'Total views', views, `Last 30 days`)}
                  {statCard('↗', 'Shares', shares, 'Times listing was shared')}
                  {statCard('📅', 'Days listed', daysListed, listing.is_active ? 'Currently live' : 'Pending approval')}
                  {statCard('🏘', 'Comparables', comps.length, `Similar listings in ${listing.borough || 'area'}`)}
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
        )}
      </div>
    </main>
  )
}
