'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FeaturedListings from '@/components/FeaturedListings'
import SearchFilters from '@/components/SearchFilters'

const SUGGESTIONS = [
  'Angel', 'Balham', 'Battersea', 'Bermondsey', 'Bethnal Green', 'Bow', 'Brixton',
  'Camden', 'Canary Wharf', 'Clapham', 'Clerkenwell', 'Dalston', 'Earls Court',
  'Fulham', 'Greenwich', 'Hackney', 'Hammersmith', 'Hampstead', 'Highbury',
  'Islington', 'Kennington', 'Notting Hill', 'Peckham', 'Primrose Hill',
  'Shepherd Bush', 'Shoreditch', 'Soho', 'Stockwell', 'Stoke Newington',
  'Stratford', 'Tooting', 'Vauxhall', 'Walthamstow', 'Wandsworth', 'Whitechapel',
  'E1', 'E2', 'E3', 'E8', 'E14', 'EC1', 'EC2', 'N1', 'N16',
  'NW1', 'NW3', 'NW6', 'SE1', 'SE5', 'SE15', 'SE22',
  'SW4', 'SW6', 'SW9', 'SW11', 'W1', 'W2', 'W11', 'WC1', 'WC2',
]

const PRICE_OPTIONS = [null, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000]
const BED_OPTIONS = [null, 1, 2, 3, 4, 5]

type ActivePanel = 'location' | 'minPrice' | 'maxPrice' | 'minBeds' | 'maxBeds' | null

export default function HomePage() {
  const [location, setLocation] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [minBeds, setMinBeds] = useState<number | null>(null)
  const [maxBeds, setMaxBeds] = useState<number | null>(null)
  const [active, setActive] = useState<ActivePanel>(null)
  const [furnished, setFurnished] = useState<string | null>(null)
  const [propertyType, setPropertyType] = useState<string | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [addedWithin, setAddedWithin] = useState<number | null>(null)
  const [availableFrom, setAvailableFrom] = useState<string | null>(null)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleLocationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocation(val)
    if (val.length > 0) {
      setSuggestions(SUGGESTIONS.filter(s => s.toLowerCase().startsWith(val.toLowerCase())).slice(0, 6))
    } else {
      setSuggestions([])
    }
  }

  function doSearch() {
    const p = new URLSearchParams()
    p.set('type', 'rent')
    if (location) p.set('location', location)
    if (minBeds) p.set('minBeds', String(minBeds))
    if (maxBeds) p.set('maxBeds', String(maxBeds))
    if (minPrice) p.set('minPrice', String(minPrice))
    if (maxPrice) p.set('maxPrice', String(maxPrice))
    if (furnished) p.set('furnished', furnished)
    if (propertyType) p.set('propertyType', propertyType)
    if (features.length > 0) p.set('features', features.join(','))
    if (addedWithin) p.set('addedWithin', String(addedWithin))
    if (availableFrom) p.set('availableFrom', availableFrom)
    router.push('/search?' + p.toString())
  }

  const priceLabel = minPrice || maxPrice
    ? [minPrice ? '£' + minPrice.toLocaleString() : 'Min', maxPrice ? '£' + maxPrice.toLocaleString() : 'Max'].join(' – ')
    : null
  const bedsLabel = minBeds || maxBeds
    ? [minBeds ?? 'Min', maxBeds ?? 'Max'].join(' – ') + ' bed'
    : null

  return (
    <main>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <div className="relative min-h-screen">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1800&q=85&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6">
          <div className="text-2xl font-light text-white" style={{fontFamily: 'Georgia, serif'}}>
            nest<span style={{color: '#D85A30'}} className="italic">london</span>
          </div>
          <div className="flex gap-6 text-sm text-white/70">
            <span className="cursor-pointer hover:text-white transition-colors">Buy</span>
            <span className="cursor-pointer hover:text-white transition-colors">Rent</span>
            <span className="cursor-pointer hover:text-white transition-colors">For agents</span>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <h1 className="text-6xl font-light text-white text-center mb-12 leading-tight" style={{fontFamily: 'Georgia, serif'}}>
            Find your next home
          </h1>

          {/* Unified search bar */}
          <div ref={ref} className="w-full max-w-4xl">
            <div className="bg-white rounded-2xl shadow-2xl flex items-stretch overflow-visible relative">

              {/* Location */}
              <div
                className={'flex-1 flex flex-col justify-center px-5 py-3 cursor-text rounded-l-2xl transition-colors ' + (active === 'location' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => setActive('location')}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Location</div>
                <input
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => setActive('location')}
                  placeholder="Where are you looking?"
                  className="text-sm text-stone-800 bg-transparent outline-none placeholder-stone-300 w-full"
                  autoComplete="off"
                />
                {active === 'location' && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {suggestions.map(s => (
                      <button key={s} type="button"
                        onClick={() => { setLocation(s); setSuggestions([]); setActive(null) }}
                        className="w-full text-left px-5 py-3 text-sm text-stone-700 hover:bg-[#F1EFE8] flex items-center gap-3"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="1.5"/>
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5"/>
                        </svg>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* Price range */}
              <div
                className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[160px] ' + (active === 'minPrice' || active === 'maxPrice' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => setActive(active === 'minPrice' || active === 'maxPrice' ? null : 'minPrice')}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Price range</div>
                <div className={'text-sm ' + (priceLabel ? 'text-stone-800' : 'text-stone-300')}>{priceLabel || 'Any price'}</div>
                {(active === 'minPrice' || active === 'maxPrice') && (
                  <div className="absolute top-full left-1/4 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-4 w-80" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {PRICE_OPTIONS.map(p => (
                            <button key={String(p)} onClick={() => { setMinPrice(p); setActive('maxPrice') }}
                              className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F1EFE8] text-stone-700')}
                            >{p === null ? 'No min' : '£' + p.toLocaleString()}</button>
                          ))}
                        </div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {PRICE_OPTIONS.map(p => (
                            <button key={String(p)} onClick={() => { setMaxPrice(p); setActive(null) }}
                              className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F1EFE8] text-stone-700')}
                            >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* Bedrooms */}
              <div
                className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[140px] ' + (active === 'minBeds' || active === 'maxBeds' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => setActive(active === 'minBeds' || active === 'maxBeds' ? null : 'minBeds')}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Bedrooms</div>
                <div className={'text-sm ' + (bedsLabel ? 'text-stone-800' : 'text-stone-300')}>{bedsLabel || 'Any beds'}</div>
                {(active === 'minBeds' || active === 'maxBeds') && (
                  <div className="absolute top-full right-16 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-4 w-56" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                        {BED_OPTIONS.map(b => (
                          <button key={String(b)} onClick={() => { setMinBeds(b); setActive('maxBeds') }}
                            className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F1EFE8] text-stone-700')}
                          >{b === null ? 'No min' : b + ' bed'}</button>
                        ))}
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                        {BED_OPTIONS.map(b => (
                          <button key={String(b)} onClick={() => { setMaxBeds(b); setActive(null) }}
                            className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F1EFE8] text-stone-700')}
                          >{b === null ? 'No max' : b + ' bed'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* More filters */}
              <div className="flex items-center px-2">
                <SearchFilters
                  location={location}
                  listingType="rent"
                  minBeds={minBeds}
                  maxBeds={maxBeds}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  furnished={furnished}
                  propertyType={propertyType}
                  features={features}
                  radius={null}
                  addedWithin={addedWithin}
                  availableFrom={availableFrom}
                  onApply={(p) => {
                    setFurnished(p.get('furnished') || null)
                    setPropertyType(p.get('propertyType') || null)
                    setFeatures(p.get('features') ? p.get('features')!.split(',') : [])
                    setAddedWithin(p.get('addedWithin') ? parseInt(p.get('addedWithin')!) : null)
                    setAvailableFrom(p.get('availableFrom') || null)
                  }}
                />
              </div>

              {/* Search button */}
              <button
                onClick={doSearch}
                className="flex items-center gap-2 px-7 m-2 rounded-xl text-white font-medium text-sm transition-opacity hover:opacity-90 flex-shrink-0"
                style={{background: '#D85A30'}}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Search
              </button>
            </div>

            <p className="text-center text-white/50 text-xs mt-4">
              Aggregating listings from Rightmove, Zoopla and OnTheMarket
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
            <span className="text-xs tracking-widest uppercase">Scroll</span>
            <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── FEATURED LISTINGS ───────────────────────────────────── */}
      <FeaturedListings />
    </main>
  )
}
