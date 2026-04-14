'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
const BED_OPTIONS = [null, 0, 1, 2, 3, 4, 5]
const RADIUS_OPTIONS = [null, 0.5, 1, 2, 3, 5, 10]

type Panel = 'location' | 'radius' | 'minPrice' | 'maxPrice' | 'minBeds' | 'maxBeds' | 'addedWithin' | null

interface Props {
  location: string
  listingType: string
  minBeds: number | null
  maxBeds: number | null
  minPrice: number | null
  maxPrice: number | null
  radius: number | null
  furnished?: string | null
  propertyType?: string | null
  features?: string[]
  addedWithin?: number | null
  availableFrom?: string | null
  style?: string | null
  commuteAddress?: string | null
  maxCommute?: number | null
}

export default function NavSearchBar({
  location: initLocation,
  listingType,
  minBeds: initMinBeds,
  maxBeds: initMaxBeds,
  minPrice: initMinPrice,
  maxPrice: initMaxPrice,
  radius: initRadius,
  furnished = null,
  propertyType = null,
  features = [],
  addedWithin = null,
  availableFrom = null,
  style = null,
  commuteAddress = null,
  maxCommute = null,}: Props) {
  const [location, setLocation] = useState(initLocation)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number | null>(initMinPrice)
  const [maxPrice, setMaxPrice] = useState<number | null>(initMaxPrice)
  const [minBeds, setMinBeds] = useState<number | null>(initMinBeds)
  const [maxBeds, setMaxBeds] = useState<number | null>(initMaxBeds)
  const [radius, setRadius] = useState<number | null>(initRadius)
  const [active, setActive] = useState<Panel>(null)
  const [localAddedWithin, setLocalAddedWithin] = useState<number | null>(addedWithin)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function handleClear() {
      setMinBeds(null); setMaxBeds(null); setMinPrice(null); setMaxPrice(null); setRadius(null); setLocalAddedWithin(null)
    }
    window.addEventListener('nestlondon:clearFilters', handleClear)
    return () => window.removeEventListener('nestlondon:clearFilters', handleClear)
  }, [])

  function doSearch(overrides: Partial<{loc: string, r: number|null, minB: number|null, maxB: number|null, minP: number|null, maxP: number|null}> = {}) {
    const p = new URLSearchParams()
    p.set('type', listingType)
    const loc = overrides.loc ?? location
    const r = overrides.r !== undefined ? overrides.r : radius
    const minB = overrides.minB !== undefined ? overrides.minB : minBeds
    const maxB = overrides.maxB !== undefined ? overrides.maxB : maxBeds
    const minP = overrides.minP !== undefined ? overrides.minP : minPrice
    const maxP = overrides.maxP !== undefined ? overrides.maxP : maxPrice
    if (loc) p.set('location', loc)
    if (r) p.set('radius', String(r))
    else if (loc) p.set('radius', '0.25')
    if (minB !== null) p.set('minBeds', String(minB))
    if (maxB !== null) p.set('maxBeds', String(maxB))
    if (minP) p.set('minPrice', String(minP))
    if (maxP) p.set('maxPrice', String(maxP))
    if (furnished) p.set('furnished', furnished)
    if (propertyType) p.set('propertyType', propertyType)
    if (style) p.set('style', style)
    if (commuteAddress) p.set('commuteAddress', commuteAddress)
    if (maxCommute) p.set('maxCommute', String(maxCommute))
    if (features.length > 0) p.set('features', features.join(','))
    const aw = localAddedWithin
    if (aw) p.set('addedWithin', String(aw))
    if (availableFrom) p.set('availableFrom', availableFrom)
    router.push('/search?' + p.toString())
  }

  function handleLocationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocation(val)
    setSuggestions(val.length > 0 ? SUGGESTIONS.filter(s => s.toLowerCase().startsWith(val.toLowerCase())).slice(0, 6) : [])
  }

  const priceLabel = minPrice || maxPrice
    ? [minPrice ? '£' + minPrice.toLocaleString() : 'Min', maxPrice ? '£' + maxPrice.toLocaleString() : 'Max'].join(' – ')
    : 'Price'

  const bedsLabel = minBeds !== null || maxBeds !== null
    ? [(minBeds === 0 ? 'Studio' : minBeds ?? 'Min'), (maxBeds === 0 ? 'Studio' : maxBeds ?? 'Max')].join(' – ') + (minBeds === 0 && maxBeds === 0 ? '' : ' bed')
    : 'Beds'

  const radiusLabel = radius ? `Within ${radius} mi` : 'This area only'
  const addedWithinLabel = localAddedWithin ? (localAddedWithin === 0.042 ? '1hr' : localAddedWithin === 1 ? '24h' : localAddedWithin === 30 ? '1 month' : localAddedWithin === 90 ? '3 months' : localAddedWithin + 'd') : 'Added'
  const priceActive = !!(minPrice || maxPrice)
  const bedsActive = minBeds !== null || maxBeds !== null

  return (
    <div ref={ref} className="flex-1 relative">
      <div className="flex items-stretch bg-white border border-[#E8E2DA] rounded-xl shadow-sm overflow-visible" style={{minHeight: '44px'}}>

        {/* Location + radius */}
        <div className="flex items-stretch flex-1 min-w-0">
          <div className="flex items-center flex-1 px-3 gap-2 cursor-text" onClick={() => setActive('location')}>
            <svg className="w-3.5 h-3.5 text-[#9B928E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
              <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={location}
              onChange={handleLocationChange}
              onFocus={() => setActive('location')}
              placeholder="Location"
              className="text-sm text-[#3D3A38] bg-transparent outline-none placeholder-[#9B928E] w-full min-w-0"
              autoComplete="off"
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
          </div>
          {/* Radius inside location section */}
          <div className="flex items-center border-l border-[#E8E2DA]">
            <button
              onClick={() => setActive(active === 'radius' ? null : 'radius')}
              className={'text-xs px-3 py-1.5 whitespace-nowrap transition-colors ' + (radius ? 'text-[#D3755A] font-medium' : 'text-[#9B928E]')}
            >
              {radiusLabel}
              <svg className="w-3 h-3 inline ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="w-px bg-[#E8E2DA] self-stretch my-2" />

        {/* Price */}
        <button
          onClick={() => setActive(active === 'minPrice' || active === 'maxPrice' ? null : 'minPrice')}
          className={'px-3 text-sm whitespace-nowrap transition-colors ' + (priceActive ? 'text-[#D3755A] font-medium' : 'text-[#9B928E] hover:text-[#3D3A38]')}
        >{priceLabel}</button>

        <div className="w-px bg-[#E8E2DA] self-stretch my-2" />

        {/* Beds */}
        <button
          onClick={() => setActive(active === 'minBeds' || active === 'maxBeds' ? null : 'minBeds')}
          className={'px-3 text-sm whitespace-nowrap transition-colors ' + (bedsActive ? 'text-[#D3755A] font-medium' : 'text-[#9B928E] hover:text-[#3D3A38]')}
        >{bedsLabel}</button>

        <div className="w-px bg-[#E8E2DA] self-stretch my-2" />

        <div className="w-px bg-[#E8E2DA] self-stretch my-2" />

        {/* Added within */}
        <button
          onClick={() => setActive(active === 'addedWithin' ? null : 'addedWithin')}
          className={'px-3 text-sm whitespace-nowrap transition-colors ' + (localAddedWithin ? 'text-[#D3755A] font-medium' : 'text-[#9B928E] hover:text-[#3D3A38]')}
        >{addedWithinLabel}</button>

        <div className="w-px bg-[#E8E2DA] self-stretch my-2" />

        {/* Filters */}
        <div className="flex items-center px-2">
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
            radius={radius}
            addedWithin={addedWithin}
            availableFrom={availableFrom}
            style={style}
            commuteAddress={commuteAddress || ''}
            maxCommute={maxCommute}
          />
        </div>

        {/* Search button */}
        <button
          onClick={() => doSearch()}
          className="flex items-center gap-1.5 px-4 m-1.5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 flex-shrink-0"
          style={{background: '#D3755A'}}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Search
        </button>
      </div>

      {/* Dropdowns */}
      {active === 'location' && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 overflow-hidden w-72">
          {suggestions.map(s => (
            <button key={s} onClick={() => { setLocation(s); setSuggestions([]); setActive(null); doSearch({loc: s}) }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#3D3A38] hover:bg-[#F5EBE0] flex items-center gap-2.5">
              <svg className="w-3.5 h-3.5 text-[#9B928E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="1.5"/>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5"/>
              </svg>
              {s}
            </button>
          ))}
        </div>
      )}

      {active === 'radius' && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-40">
          {RADIUS_OPTIONS.map(r => (
            <button key={String(r)} onClick={() => { setRadius(r); setActive(null); doSearch({r}) }}
              className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (radius === r ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
              style={radius === r ? {background: '#D3755A'} : {}}
            >{r === null ? 'This area only' : `Within ${r} mi`}</button>
          ))}
        </div>
      )}

      {active === 'addedWithin' && (
        <div className="absolute top-full left-1/2 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-44">
          {([null, 0.042, 1, 3, 7, 14, 30, 90] as (number|null)[]).map(d => (
            <button key={String(d)} onClick={() => { setLocalAddedWithin(d); setActive(null); doSearch() }}
              className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (localAddedWithin === d ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
              style={localAddedWithin === d ? {background: '#D3755A'} : {}}
            >{d === null ? 'Any time' : d === 0.042 ? '1 hour' : d === 1 ? '24 hours' : d === 30 ? '1 month' : d === 90 ? '3 months' : d + ' days'}</button>
          ))}
        </div>
      )}

      {(active === 'minPrice' || active === 'maxPrice') && (
        <div className="absolute top-full left-1/4 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-72" onClick={e => e.stopPropagation()}>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Min</div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {PRICE_OPTIONS.map(p => (
                  <button key={String(p)} onClick={() => { setMinPrice(p); setActive('maxPrice') }}
                    className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minPrice === p ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                    style={minPrice === p ? {background: '#D3755A'} : {}}
                  >{p === null ? 'No min' : '£' + p.toLocaleString()}</button>
                ))}
              </div>
            </div>
            <div className="w-px bg-[#E8E2DA]" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Max</div>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {PRICE_OPTIONS.map(p => (
                  <button key={String(p)} onClick={() => { setMaxPrice(p); setActive(null); doSearch({maxP: p}) }}
                    className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxPrice === p ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                    style={maxPrice === p ? {background: '#D3755A'} : {}}
                  >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(active === 'minBeds' || active === 'maxBeds') && (
        <div className="absolute top-full left-1/2 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-56" onClick={e => e.stopPropagation()}>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Min</div>
              {BED_OPTIONS.map(b => (
                <button key={String(b)} onClick={() => { setMinBeds(b); setActive('maxBeds') }}
                  className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minBeds === b ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                  style={minBeds === b ? {background: '#D3755A'} : {}}
                >{b === null ? 'No min' : b === 0 ? 'Studio' : b + ' bed'}</button>
              ))}
            </div>
            <div className="w-px bg-[#E8E2DA]" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Max</div>
              {BED_OPTIONS.map(b => (
                <button key={String(b)} onClick={() => { setMaxBeds(b); setActive(null); doSearch({maxB: b}) }}
                  className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxBeds === b ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                  style={maxBeds === b ? {background: '#D3755A'} : {}}
                >{b === null ? 'No max' : b === 0 ? 'Studio' : b + ' bed'}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
