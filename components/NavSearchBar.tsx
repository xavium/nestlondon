'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchFilters, { type SearchFiltersHandle } from '@/components/SearchFilters'
import SaveSearchButton from '@/components/SaveSearchButton'
import { serializeCommuteLocations, type CommuteLocation } from '@/lib/commute'

const LONDON_BOROUGHS = ['Barking and Dagenham','Barnet','Bexley','Brent','Bromley','Camden','City of London','Croydon','Ealing','Enfield','Greenwich','Hackney','Hammersmith and Fulham','Haringey','Harrow','Havering','Hillingdon','Hounslow','Islington','Kensington and Chelsea','Kingston upon Thames','Lambeth','Lewisham','Merton','Newham','Redbridge','Richmond upon Thames','Southwark','Sutton','Tower Hamlets','Waltham Forest','Wandsworth','Westminster']

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

const RENT_PRICE_OPTIONS = [null, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000]
const BUY_PRICE_OPTIONS = [null, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 500000, 600000, 750000, 1000000, 1250000, 1500000, 2000000, 3000000, 5000000]
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
  commuteLocations?: CommuteLocation[]
  tenure?: string | null
  chainFree?: boolean
  newBuild?: boolean
  leaseholdMin?: number | null
  minBaths?: number | null
  maxBaths?: number | null
  maxPricePerSqm?: number | null
  minPricePerSqm?: number | null
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
  tenure = null,
  chainFree = false,
  newBuild = false,
  leaseholdMin = null,
  minBaths = null,
  maxBaths = null,
  maxPricePerSqm = null,
  minPricePerSqm = null,
  commuteLocations = [],}: Props) {
  const PRICE_OPTIONS = listingType === 'buy' ? BUY_PRICE_OPTIONS : RENT_PRICE_OPTIONS
  const [location, setLocation] = useState(initLocation)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number | null>(initMinPrice)
  const [maxPrice, setMaxPrice] = useState<number | null>(initMaxPrice)
  const [minBeds, setMinBeds] = useState<number | null>(initMinBeds)
  const [maxBeds, setMaxBeds] = useState<number | null>(initMaxBeds)
  const [radius, setRadius] = useState<number | null>(initRadius)
  const [active, setActive] = useState<Panel>(null)
  // Wrap setActive: when opening (non-null), notify other dropdowns to close
  function setActivePanel(p: Panel) {
    if (p !== null) window.dispatchEvent(new Event('nestlondon:closeDropdowns'))
    setActive(p)
  }
  const [localAddedWithin, setLocalAddedWithin] = useState<number | null>(addedWithin)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<SearchFiltersHandle>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setActive(null)
    }
    function handleCloseAll() { setActive(null) }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('nestlondon:closeDropdowns', handleCloseAll)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('nestlondon:closeDropdowns', handleCloseAll)
    }
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
    else if (loc) {
      // Don't auto-set radius when the location is a London borough or postcode district,
      // since those should be filtered by polygon match, not radius
      const isBorough = LONDON_BOROUGHS.some((b: string) => b.toLowerCase() === loc.toLowerCase())
      const isPostcode = /^[A-Z]{1,2}[0-9]{1,2}$/i.test(loc.trim())
      if (!isBorough && !isPostcode) p.set('radius', '0.25')
    }
    if (minB !== null) p.set('minBeds', String(minB))
    if (maxB !== null) p.set('maxBeds', String(maxB))
    if (minP) p.set('minPrice', String(minP))
    if (maxP) p.set('maxPrice', String(maxP))
    if (furnished) p.set('furnished', furnished)
    if (propertyType) p.set('propertyType', propertyType)
    if (style) p.set('style', style)
    // Legacy commuteAddress / maxCommute URL params removed — see encoded `commute=` below.

    if (commuteLocations && commuteLocations.length > 0) {
      const encoded = serializeCommuteLocations(commuteLocations)
      if (encoded) p.set('commute', encoded)
    }
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
    : listingType === 'buy' ? 'Price' : 'Price'

  const bedsLabel = minBeds !== null || maxBeds !== null
    ? [(minBeds === 0 ? 'Studio' : minBeds ?? 'Min'), (maxBeds === 0 ? 'Studio' : maxBeds ?? 'Max')].join(' – ') + (minBeds === 0 && maxBeds === 0 ? '' : ' bed')
    : 'Beds'

  const radiusLabel = radius ? `Within ${radius} mi` : 'This area only'
  const addedWithinLabel = localAddedWithin ? (localAddedWithin === 0.042 ? '1hr' : localAddedWithin === 1 ? '24h' : localAddedWithin === 30 ? '1 month' : localAddedWithin === 90 ? '3 months' : localAddedWithin + 'd') : 'Added'
  const priceActive = !!(minPrice || maxPrice)
  const bedsActive = minBeds !== null || maxBeds !== null

  // Shared className for the pill-style field boxes (Zoopla-inspired). Each field
  // is its own rounded box with its own border; gaps between fields rather than
  // internal dividers. Active state lifts to brand orange.
  // Sharper corners (rounded-md vs the previous rounded-xl) to better match the
  // Zoopla pill style. h-11 keeps every pill exactly the same height.
  const pillBase = 'flex items-center bg-white border rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors h-11'
  const pillIdle = 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A] hover:text-[#3D3A38]'
  const pillActive = 'border-[#D3755A] text-[#D3755A] font-medium'
  const chevron = (
    <svg className="w-3 h-3 ml-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  return (
    <div ref={ref} className="flex-1 relative">
      <div className="flex items-center gap-2">

        {/* Location (with embedded radius). Search icon + free-text input + radius
            dropdown all share a single pill — they're a single "where" concern.
            Submits on Enter or suggestion-click (handled below).
            relative: anchors the suggestions/radius dropdowns directly below this pill. */}
        <div className={pillBase + ' ' + (location ? pillActive : pillIdle) + ' flex-1 min-w-[200px] relative'}>
          <svg className="w-4 h-4 flex-shrink-0 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
            <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={location}
            onChange={handleLocationChange}
            onFocus={() => setActivePanel('location')}
            placeholder="Location"
            className="text-sm text-[#3D3A38] bg-transparent outline-none placeholder-[#9B928E] w-full min-w-0"
            autoComplete="off"
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          {/* Location suggestions dropdown — anchored to this pill's left edge. */}
          {active === 'location' && suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-md shadow-xl z-50 overflow-hidden w-72">
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
        </div>

        {/* Radius — now its own pill, sibling to Location. Same shape as
            Beds/Price/Added: own `relative` wrapper, dropdown anchored to
            `left: 0` of the wrapper. Defaults to "This area only" when no
            radius is selected. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePanel(active === 'radius' ? null : 'radius')}
            className={pillBase + ' ' + (radius ? pillActive : pillIdle)}
          >
            {radiusLabel}
            {chevron}
          </button>

          {active === 'radius' && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: 'white',
              border: '1px solid #E8E2DA',
              borderRadius: 6,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              zIndex: 50,
              padding: 8,
              width: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}>
              {RADIUS_OPTIONS.map(r => (
                <button key={String(r)} onClick={() => { setRadius(r); setActive(null); doSearch({r}) }}
                  className={'w-full text-left text-sm px-3 py-2 rounded-md transition-colors ' + (radius === r ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                  style={radius === r ? {background: '#D3755A'} : {}}
                >{r === null ? 'This area only' : `Within ${r} mi`}</button>
              ))}
            </div>
          )}
        </div>

        {/* Beds */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePanel(active === 'minBeds' || active === 'maxBeds' ? null : 'minBeds')}
            className={pillBase + ' ' + (bedsActive ? pillActive : pillIdle)}
          >
            {bedsLabel}
            {chevron}
          </button>

          {(active === 'minBeds' || active === 'maxBeds') && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-md shadow-xl z-50 p-4 w-56" onClick={e => e.stopPropagation()}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Min</div>
                  {BED_OPTIONS.map(b => (
                    <button key={String(b)} onClick={() => { setMinBeds(b); setActive('maxBeds') }}
                      className={'w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ' + (minBeds === b ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                      style={minBeds === b ? {background: '#D3755A'} : {}}
                    >{b === null ? 'No min' : b === 0 ? 'Studio' : b + ' bed'}</button>
                  ))}
                </div>
                <div className="w-px bg-[#E8E2DA]" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Max</div>
                  {BED_OPTIONS.map(b => (
                    <button key={String(b)} onClick={() => { setMaxBeds(b); setActive(null); doSearch({maxB: b}) }}
                      className={'w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ' + (maxBeds === b ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                      style={maxBeds === b ? {background: '#D3755A'} : {}}
                    >{b === null ? 'No max' : b === 0 ? 'Studio' : b + ' bed'}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setActivePanel(active === 'minPrice' || active === 'maxPrice' ? null : 'minPrice')}
            className={pillBase + ' ' + (priceActive ? pillActive : pillIdle)}
          >
            {priceLabel}
            {chevron}
          </button>

          {(active === 'minPrice' || active === 'maxPrice') && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-md shadow-xl z-50 p-4 w-72" onClick={e => e.stopPropagation()}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Min</div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {PRICE_OPTIONS.map(p => (
                      <button key={String(p)} onClick={() => { setMinPrice(p); setActive('maxPrice') }}
                        className={'text-left text-sm px-3 py-1.5 rounded-md transition-colors ' + (minPrice === p ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
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
                        className={'text-left text-sm px-3 py-1.5 rounded-md transition-colors ' + (maxPrice === p ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                        style={maxPrice === p ? {background: '#D3755A'} : {}}
                      >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Added within — hidden on narrow viewports (md and down). Less essential
            than location/beds/price; collapses cleanly while preserving the row layout. */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setActivePanel(active === 'addedWithin' ? null : 'addedWithin')}
            className={pillBase + ' ' + (localAddedWithin ? pillActive : pillIdle)}
          >
            {addedWithinLabel}
            {chevron}
          </button>

          {active === 'addedWithin' && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E8E2DA] rounded-md shadow-xl z-50 p-2 w-44">
              {([null, 0.042, 1, 3, 7, 14, 30, 90] as (number|null)[]).map(d => (
                <button key={String(d)} onClick={() => { setLocalAddedWithin(d); setActive(null); doSearch() }}
                  className={'w-full text-left text-sm px-3 py-2 rounded-md transition-colors ' + (localAddedWithin === d ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                  style={localAddedWithin === d ? {background: '#D3755A'} : {}}
                >{d === null ? 'Any time' : d === 0.042 ? '1 hour' : d === 1 ? '24 hours' : d === 30 ? '1 month' : d === 90 ? '3 months' : d + ' days'}</button>
              ))}
            </div>
          )}
        </div>

        {/* Filters — outlined button. SearchFilters renders its own trigger; we wrap
            it in a pill-styled container so it visually matches the field boxes.
            (SearchFilters' trigger restyle is in patch 2.) */}
        <div className="flex items-center">
          <SearchFilters
            ref={filtersRef}
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
            commuteLocations={commuteLocations}
            tenure={tenure}
            chainFree={chainFree}
            newBuild={newBuild}
            leaseholdMin={leaseholdMin}
            minBaths={minBaths}
            maxBaths={maxBaths}
            maxPricePerSqm={maxPricePerSqm}
            minPricePerSqm={minPricePerSqm}
          />
        </div>

        {/* Save (primary action). SaveSearchButton reads URL params itself, so no
            props needed. Styled here as the Zoopla-style heart+label primary button. */}
        <SaveSearchButton />
      </div>

    </div>
  )
}
