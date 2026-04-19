'use client'
import NavAuthButton from '@/components/NavAuthButton'
import AnimatedWord from '@/components/AnimatedWord'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import BoroughQuiz from '@/components/BoroughQuiz'
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
const BUY_PRICE_OPTIONS = [null, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 500000, 600000, 750000, 1000000, 1250000, 1500000, 2000000, 3000000, 5000000]
const BED_OPTIONS = [null, 0, 1, 2, 3, 4, 5]

type ActivePanel = 'location' | 'minPrice' | 'maxPrice' | 'minBeds' | 'maxBeds' | 'addedWithin' | 'radius' | null

export default function HomePage() {
  const [listingMode, setListingMode] = useState<'rent' | 'buy'>('rent')
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)

  function switchMode(mode: 'rent' | 'buy') {
    if (mode === listingMode) return
    setSlideDir(mode === 'buy' ? 'left' : 'right')
    setTimeout(() => { setListingMode(mode); setSlideDir(null) }, 200)
  }
  const [location, setLocation] = useState('')
  const [radius, setRadius] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [minBeds, setMinBeds] = useState<number | null>(null)
  const [maxBeds, setMaxBeds] = useState<number | null>(null)
  const [active, setActive] = useState<ActivePanel>(null)
  const [addedWithin, setAddedWithin] = useState<number | null>(null)
  const [furnished, setFurnished] = useState<string | null>(null)
  const [propertyType, setPropertyType] = useState<string | null>(null)
  const [features, setFeatures] = useState<string[]>([])
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
    p.set('type', listingMode)
    if (location) p.set('location', location)
    if (minBeds) p.set('minBeds', String(minBeds))
    if (maxBeds) p.set('maxBeds', String(maxBeds))
    if (minPrice) p.set('minPrice', String(minPrice))
    if (maxPrice) p.set('maxPrice', String(maxPrice))
    if (addedWithin) p.set('addedWithin', String(addedWithin))
    if (furnished) p.set('furnished', furnished)
    if (propertyType) p.set('propertyType', propertyType)
    if (features.length > 0) p.set('features', features.join(','))
    if (availableFrom) p.set('availableFrom', availableFrom)
    router.push('/search?' + p.toString())
  }

  const priceLabel = minPrice || maxPrice
    ? [minPrice ? '£' + minPrice.toLocaleString() : 'Min', maxPrice ? '£' + maxPrice.toLocaleString() : 'Max'].join(' – ')
    : null
  const bedsLabel = (minBeds !== null || maxBeds !== null)
    ? [(minBeds === 0 ? 'Studio' : minBeds ?? 'Min'), (maxBeds === 0 ? 'Studio' : maxBeds ?? 'Max')].join(' – ') + (minBeds === 0 && maxBeds === 0 ? '' : ' bed')
    : null
  const addedWithinLabel = (() => {
    if (!addedWithin) return null
    if (addedWithin === 1) return '24 hours'
    if (addedWithin === 30) return '1 month'
    if (addedWithin === 90) return '3 months'
    return `${addedWithin} days`
  })()

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
        <nav className="relative z-50 flex items-center justify-between px-8 py-6">
          <div className="text-2xl font-light text-white" style={{fontFamily: 'Georgia, serif'}}>
            nest<span style={{color: '#D85A30'}} className="italic">london</span>
          </div>
          <div className="flex gap-6 text-sm text-white/70 items-center">
            <a href="/boroughs" className="text-sm text-white/70 hover:text-white transition-colors no-underline">Borough guides</a>
            <NavAuthButton />
            <a href="/list" className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 no-underline flex-shrink-0" style={{background:'#D3755A'}}>
              List your property
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-20 pb-32">
          <h1 className="text-6xl font-light text-white text-center mb-12 leading-tight whitespace-nowrap" style={{fontFamily: 'Georgia, serif'}}>
            Find your next{' '}
            <span style={{display:'inline-block', width:'5ch', verticalAlign:'bottom', overflow:'hidden'}}>
              <AnimatedWord />
            </span>
          </h1>

          {/* Unified search bar */}
          <div className="flex justify-center mb-4">
            <div className="flex bg-white/15 backdrop-blur-sm rounded-full p-1 gap-1">
              {(['rent', 'buy'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => switchMode(mode)}
                  className={'px-6 py-2 rounded-full text-sm font-medium transition-all ' + (listingMode === mode ? 'bg-white text-[#1B2E4B] shadow-sm' : 'text-white/80 hover:text-white')}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div ref={ref} className="w-full max-w-5xl" style={{fontFamily: "var(--font-sans, Manrope, system-ui)"}}>
            <div className="bg-white rounded-2xl shadow-2xl flex items-stretch overflow-visible relative">
              {listingMode === 'buy' && (
                <div className="flex flex-1 items-stretch" style={{animation: 'fadeSlide 0.25s ease'}}>
                  {/* Location */}
                  <div className={'flex-[3] flex flex-col justify-center px-5 py-3 cursor-text rounded-l-2xl transition-colors ' + (active === 'location' ? 'bg-stone-50' : 'hover:bg-stone-50')} onClick={() => setActive('location')}>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Location</div>
                    <input value={location} onChange={handleLocationChange} onFocus={() => setActive('location')} placeholder="Where are you looking to buy?" className="text-sm text-[#1C2B3A] bg-transparent outline-none placeholder-stone-300 w-full" autoComplete="off" onKeyDown={e => e.key === 'Enter' && doSearch()} />
                  </div>
                  <div className="w-px bg-stone-200 self-stretch my-3" />
                  {/* Distance */}
                  <div className="relative">
                    <button onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'radius' ? null : 'radius') }}
                      className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors ' + (active === 'radius' ? 'bg-stone-50' : 'hover:bg-stone-50')}>
                      <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Distance</div>
                      <div className={'text-sm ' + (radius ? 'text-[#1C2B3A]' : 'text-stone-300')}>{radius ? `Within ${radius} mi` : 'This area only'}</div>
                    </button>
                    {active === 'radius' && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-44" onClick={e => e.stopPropagation()}>
                        {([null, 0.5, 1, 2, 3, 5, 10] as (number|null)[]).map(r => (
                          <button key={String(r)} type="button" onClick={() => { setRadius(r); setActive(null) }}
                            className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (radius === r ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                            style={radius === r ? {background:'#D3755A'} : {}}>
                            {r === null ? 'This area only' : `Within ${r} mi`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-px bg-stone-200 self-stretch my-3" />
                  {/* Price */}
                  <div className="relative">
                  <div className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[110px] ' + (active === 'minPrice' || active === 'maxPrice' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                    onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'minPrice' || active === 'maxPrice' ? null : 'minPrice') }}>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Price</div>
                    <div className={'text-sm ' + ((minPrice || maxPrice) ? 'text-[#1C2B3A] font-medium' : 'text-stone-300')}>{(minPrice || maxPrice) ? [minPrice ? '£'+minPrice.toLocaleString() : 'Min', maxPrice ? '£'+maxPrice.toLocaleString() : 'Max'].join(' – ') : 'Any price'}</div>
                    {(active === 'minPrice' || active === 'maxPrice') && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-72" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                              {BUY_PRICE_OPTIONS.map(p => (
                                <button key={String(p)} onClick={() => { setMinPrice(p); setActive('maxPrice') }}
                                  className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                                >{p === null ? 'No min' : '£' + p.toLocaleString()}</button>
                              ))}
                            </div>
                          </div>
                          <div className="w-px bg-stone-100" />
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                              {BUY_PRICE_OPTIONS.map(p => (
                                <button key={String(p)} onClick={() => { setMaxPrice(p); setActive(null) }}
                                  className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                                >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="w-px bg-stone-200 self-stretch my-3" />
                  {/* Bedrooms */}
                  <div className="relative">
                  <div className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[110px] ' + (active === 'minBeds' || active === 'maxBeds' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                    onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'minBeds' || active === 'maxBeds' ? null : 'minBeds') }}>
                    <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Bedrooms</div>
                    <div className={'text-sm ' + (bedsLabel ? 'text-[#1C2B3A]' : 'text-stone-300')}>{bedsLabel || 'Any beds'}</div>
                    {(active === 'minBeds' || active === 'maxBeds') && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-56" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                            {BED_OPTIONS.map(b => (
                              <button key={String(b)} onClick={() => { setMinBeds(b); setActive('maxBeds') }}
                                className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                              >{b === null ? 'No min' : b === 0 ? 'Studio' : b + ' bed'}</button>
                            ))}
                          </div>
                          <div className="w-px bg-stone-100" />
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                            {BED_OPTIONS.map(b => (
                              <button key={String(b)} onClick={() => { setMaxBeds(b); setActive(null) }}
                                className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                              >{b === null ? 'No max' : b === 0 ? 'Studio' : b + ' bed'}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="w-px bg-stone-200 self-stretch my-3" />
                  {/* Added within */}
                  <div className="relative">
                  <div className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[110px] ' + (active === 'addedWithin' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                    onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'addedWithin' ? null : 'addedWithin') }}>
                    <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-widest mb-0.5">Added</div>
                    <div className={'text-sm ' + (addedWithinLabel ? 'text-[#3D3A38]' : 'text-stone-300')}>{addedWithinLabel || 'Any time'}</div>
                    {active === 'addedWithin' && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-44" onClick={e => e.stopPropagation()}>
                        {([null, 1, 3, 7, 14, 30, 90] as (number|null)[]).map(d => (
                          <button key={String(d)} onClick={() => { setAddedWithin(d); setActive(null) }}
                            className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (addedWithin === d ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                            style={addedWithin === d ? {background: '#D3755A'} : {}}
                          >{d === null ? 'Any time' : d === 1 ? '24 hours' : d === 30 ? '1 month' : d === 90 ? '3 months' : d + ' days'}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                  {/* More filters */}
                  <div className="flex items-center px-2">
                    <Suspense fallback={null}><SearchFilters
                      location={location}
                      listingType="buy"
                      minBeds={minBeds}
                      maxBeds={maxBeds}
                      minPrice={minPrice}
                      maxPrice={maxPrice}
                      furnished={null}
                      propertyType={propertyType}
                      features={features}
                      radius={null}
                      addedWithin={addedWithin}
                      availableFrom={null}
                      onApply={(p) => {
                        setPropertyType(p.get('propertyType') || null)
                        setFeatures(p.get('features') ? p.get('features')!.split(',') : [])
                        setAddedWithin(p.get('addedWithin') ? parseInt(p.get('addedWithin')!) : null)
                      }}
                    /></Suspense>
                  </div>
                  <div className="w-px bg-stone-200 self-stretch my-3" />
                  {/* Search button */}
                  <button onClick={doSearch} className="flex items-center gap-2 px-7 m-2 rounded-xl text-white font-medium text-sm flex-shrink-0" style={{background:'#D3755A'}}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round"/></svg>
                    Search
                  </button>
                </div>
              )}
              {listingMode === 'rent' && (
                <div className="flex flex-1 items-stretch" style={{animation: 'fadeSlide 0.25s ease'}}>

              {/* Location */}
              <div
                className={'flex-[3] flex flex-col justify-center px-5 py-3 cursor-text rounded-l-2xl transition-colors ' + (active === 'location' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => setActive('location')}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Location</div>
                <input
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => setActive('location')}
                  placeholder="Where are you looking to rent?"
                  className="text-sm text-[#1C2B3A] bg-transparent outline-none placeholder-stone-300 w-full"
                  autoComplete="off"
                />
                {active === 'location' && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 overflow-hidden">
                    {suggestions.map(s => (
                      <button key={s} type="button"
                        onClick={() => { setLocation(s); setSuggestions([]); setActive(null) }}
                        className="w-full text-left px-5 py-3 text-sm text-[#374151] hover:bg-[#F5F0EB] flex items-center gap-3"
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

              {/* Distance */}
              <div className="relative">
                <button
                  onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'radius' ? null : 'radius') }}
                  className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors ' + (active === 'radius' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                >
                  <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Distance</div>
                  <div className={'text-sm ' + (radius ? 'text-[#1C2B3A]' : 'text-stone-300')}>{radius ? `Within ${radius} mi` : 'This area only'}</div>
                </button>
                {active === 'radius' && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-44" onClick={e => e.stopPropagation()}>
                    {([null, 0.5, 1, 2, 3, 5, 10] as (number|null)[]).map(r => (
                      <button key={String(r)} type="button"
                        onClick={() => { setRadius(r); setActive(null) }}
                        className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (radius === r ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                        style={radius === r ? {background:'#D3755A'} : {}}>
                        {r === null ? 'This area only' : `Within ${r} mi`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* Price */}
              <div className="relative">
              <div
                className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[130px] ' + (active === 'minPrice' || active === 'maxPrice' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'minPrice' || active === 'maxPrice' ? null : 'minPrice') }}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Price</div>
                <div className={'text-sm ' + (priceLabel ? 'text-[#1C2B3A]' : 'text-stone-300')}>{priceLabel || 'Any price'}</div>
                {(active === 'minPrice' || active === 'maxPrice') && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-80" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {((listingMode as string) === 'buy' ? BUY_PRICE_OPTIONS : PRICE_OPTIONS).map(p => (
                            <button key={String(p)} onClick={() => { setMinPrice(p); setActive('maxPrice') }}
                              className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                            >{p === null ? 'No min' : '£' + p.toLocaleString()}</button>
                          ))}
                        </div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {((listingMode as string) === 'buy' ? BUY_PRICE_OPTIONS : PRICE_OPTIONS).map(p => (
                            <button key={String(p)} onClick={() => { setMaxPrice(p); setActive(null) }}
                              className={'text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxPrice === p ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                            >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* Bedrooms */}
              <div className="relative">
              <div
                className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[110px] ' + (active === 'minBeds' || active === 'maxBeds' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'minBeds' || active === 'maxBeds' ? null : 'minBeds') }}
              >
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Bedrooms</div>
                <div className={'text-sm ' + (bedsLabel ? 'text-[#1C2B3A]' : 'text-stone-300')}>{bedsLabel || 'Any beds'}</div>
                {(active === 'minBeds' || active === 'maxBeds') && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-4 w-56" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Min</div>
                        {BED_OPTIONS.map(b => (
                          <button key={String(b)} onClick={() => { setMinBeds(b); setActive('maxBeds') }}
                            className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (minBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                          >{b === null ? 'No min' : b === 0 ? 'Studio' : b + ' bed'}</button>
                        ))}
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Max</div>
                        {BED_OPTIONS.map(b => (
                          <button key={String(b)} onClick={() => { setMaxBeds(b); setActive(null) }}
                            className={'w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ' + (maxBeds === b ? 'bg-[#D85A30] text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
                          >{b === null ? 'No max' : b === 0 ? 'Studio' : b + ' bed'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              </div>
              <div className="w-px bg-stone-200 self-stretch my-3" />

              {/* Added within */}
              <div className="relative">
              <div
                className={'flex flex-col justify-center px-5 py-3 cursor-pointer transition-colors min-w-[110px] ' + (active === 'addedWithin' ? 'bg-stone-50' : 'hover:bg-stone-50')}
                onClick={() => { window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActive(active === 'addedWithin' ? null : 'addedWithin') }}
              >
                <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-widest mb-0.5">Added</div>
                <div className={'text-sm ' + (addedWithinLabel ? 'text-[#3D3A38]' : 'text-stone-300')}>{addedWithinLabel || 'Any time'}</div>
                {active === 'addedWithin' && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 p-2 w-44" onClick={e => e.stopPropagation()}>
                    {([null, 1, 3, 7, 14, 30, 90] as (number|null)[]).map(d => (
                      <button key={String(d)} onClick={() => { setAddedWithin(d); setActive(null) }}
                        className={'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ' + (addedWithin === d ? 'text-white' : 'hover:bg-[#F5EBE0] text-[#3D3A38]')}
                        style={addedWithin === d ? {background: '#D3755A'} : {}}
                      >{d === null ? 'Any time' : d === 1 ? '24 hours' : d === 30 ? '1 month' : d === 90 ? '3 months' : d + ' days'}</button>
                    ))}
                  </div>
                )}
              </div>

              </div>
              {/* More filters */}
              <div className="flex items-center px-2">
                <Suspense fallback={null}><SearchFilters
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
                /></Suspense>
              </div>

              <div className="w-px bg-stone-200 self-stretch my-3" />


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
              )}
            </div>

            <div className="flex justify-center mt-4">
            <a href="#borough-quiz" className="flex items-center gap-2 text-white text-sm hover:opacity-90 transition-opacity px-5 py-2.5 rounded-full font-medium"  style={{background:"#D3755A"}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="1.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5"/></svg>
              Find your perfect borough
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </a>
          </div>
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

      <div id="borough-quiz"><BoroughQuiz /></div>

      {/* ── WHY NEST? ───────────────────────────────────────────── */}
      <section style={{background: '#1C2B3A'}} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{color: '#D3755A'}}>The Nest Difference</p>
            <h2 className="text-4xl font-light text-white" style={{fontFamily: 'Georgia, serif'}}>Why search with Nest?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
                title: 'Every portal, one place',
                desc: 'We aggregate listings from Rightmove, Zoopla, OnTheMarket and more — so you never miss a home.'
              },
              {
                icon: '<path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
                title: 'Neighbourhood-first search',
                desc: 'Search by area, postcode or tube station. Filter by radius so you stay in the neighbourhoods you love.'
              },
              {
                icon: '<path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
                title: 'Smart property insights',
                desc: 'EPC ratings, council tax, outside space, concierge and more — surfaced automatically from every listing.'
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'rgba(211,117,90,0.15)'}}>
                  <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24" dangerouslySetInnerHTML={{__html: item.icon}} />
                </div>
                <h3 className="text-lg font-light text-white" style={{fontFamily: 'Georgia, serif'}}>{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOURNAL SIGNUP ──────────────────────────────────────── */}
      <section style={{background: '#F5F0EB'}} className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{color: '#D3755A'}}>The Nest Journal</p>
          <h2 className="text-4xl font-light mb-4" style={{fontFamily: 'Georgia, serif', color: '#1C2B3A'}}>
            London living, curated
          </h2>
          <p className="text-stone-500 text-sm leading-relaxed mb-8">
            Neighbourhood guides, design inspiration and market insights — delivered to your inbox.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E8E2DA] p-1.5 shadow-sm max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-4 py-2 text-sm text-[#374151] outline-none bg-transparent placeholder-stone-300"
            />
            <button
              className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 flex-shrink-0"
              style={{background: '#D3755A'}}
            >
              Subscribe
            </button>
          </div>
          <p className="text-xs text-stone-400 mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{background: '#1C2B3A'}} className="py-10 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-xl font-light text-white" style={{fontFamily: 'Georgia, serif'}}>
            nest<span style={{color: '#D3755A'}} className="italic">london</span>
          </div>
          <p className="text-white/30 text-xs">© 2026 NestLondon. All listings sourced from public portals.</p>
          <div className="flex gap-6 text-white/40 text-xs">
            <span className="cursor-pointer hover:text-white/70 transition-colors">Privacy</span>
            <span className="cursor-pointer hover:text-white/70 transition-colors">Terms</span>
            <span className="cursor-pointer hover:text-white/70 transition-colors">For agents</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
