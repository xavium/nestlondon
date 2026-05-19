'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { MapPin, Bus, Footprints, Bike, Plus, X } from 'lucide-react'
import {
  type CommuteLocation, type CommuteMode,
  MAX_COMMUTE_LOCATIONS, newLocationId, serializeCommuteLocations,
} from '@/lib/commute'
interface Props {
  location: string
  listingType: string
  minBeds: number | null
  maxBeds: number | null
  minPrice: number | null
  maxPrice: number | null
  furnished: string | null
  propertyType: string | null
  features: string[]
  style?: string | null
  radius?: number | null
  addedWithin?: number | null
  availableFrom?: string | null
  onApply?: (params: URLSearchParams) => void
  tenure?: string | null
  chainFree?: boolean
  newBuild?: boolean
  leaseholdMin?: number | null
  minBaths?: number | null
  maxBaths?: number | null
  maxPricePerSqm?: number | null
  minPricePerSqm?: number | null
  commuteLocations?: CommuteLocation[]
}

export interface SearchFiltersHandle {
  applyNow: () => void
}

const SearchFilters = forwardRef<SearchFiltersHandle, Props>(function SearchFilters(props, ref) {
  const { onApply } = props
  const isBuy = props.listingType === 'buy'
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const sp = useSearchParams()
  const [minBeds, setMinBeds] = useState<number | null>(sp.get('minBeds') ? parseInt(sp.get('minBeds')!) : null)
  const [maxBeds, setMaxBeds] = useState<number | null>(sp.get('maxBeds') ? parseInt(sp.get('maxBeds')!) : null)
  const [minPrice, setMinPrice] = useState<number | null>(sp.get('minPrice') ? parseInt(sp.get('minPrice')!) : null)
  const [maxPrice, setMaxPrice] = useState<number | null>(sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!) : null)
  const [furnished, setFurnished] = useState(props.furnished)
  const [propertyTypes, setPropertyTypes] = useState<string[]>(props.propertyType ? props.propertyType.split(',').filter(Boolean) : [])
  const [features, setFeatures] = useState<string[]>(props.features)
  const [nestOnly, setNestOnly] = useState<boolean>(() => { const sp2 = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''); return sp2.get('nestOnly') === '1' })
  const [styles, setStyles] = useState<string[]>(props.style ? props.style.split(',') : [])
  const [radius, setRadius] = useState<number | null>(sp.get('radius') ? parseFloat(sp.get('radius')!) : null)
  const [addedWithin, setAddedWithin] = useState<number | null>(props.addedWithin || null)
  const [minSize, setMinSize] = useState<number | null>(null)
  const [sizeUnit, setSizeUnit] = useState<'sqft' | 'sqm'>('sqft')
  const [minPricePerSqm, setMinPricePerSqm] = useState<number | null>(sp.get('minPricePerSqm') ? parseInt(sp.get('minPricePerSqm')!) : null)
  const [maxPricePerSqm, setMaxPricePerSqm] = useState<number | null>(sp.get('maxPricePerSqm') ? parseInt(sp.get('maxPricePerSqm')!) : null)
  const [minBaths, setMinBaths] = useState<number | null>(sp.get('minBaths') ? parseInt(sp.get('minBaths')!) : null)
  const [maxBaths, setMaxBaths] = useState<number | null>(sp.get('maxBaths') ? parseInt(sp.get('maxBaths')!) : null)
  const [maxSize, setMaxSize] = useState<number | null>(null)
  const [floorLayouts, setFloorLayouts] = useState<string[]>(sp.get('floorLayout') ? sp.get('floorLayout')!.split(',') : [])
  const [availableFrom, setAvailableFrom] = useState<string | null>(props.availableFrom || null)
  const [tenures, setTenures] = useState<string[]>(sp.get('tenure') ? sp.get('tenure')!.split(',') : (props.tenure ? [props.tenure] : []))
  const [chainFree, setChainFree] = useState<boolean>(sp.get('chainFree') === 'true' || props.chainFree || false)
  const [newBuild, setNewBuild] = useState<boolean>(sp.get('newBuild') === 'true' || props.newBuild || false)
  const [leaseholdMin, setLeaseholdMin] = useState<number | null>(sp.get('leaseholdMin') ? parseInt(sp.get('leaseholdMin')!) : (props.leaseholdMin || null))
  // Multi-location commute state. Initialise from props (which the search page resolves
  // from URL → user_metadata → legacy singular field).
  const [commuteLocations, setCommuteLocations] = useState<CommuteLocation[]>(props.commuteLocations || [])
  // Sync if parent prop changes (e.g. user opens filters on a different search URL)
  useEffect(() => { setCommuteLocations(props.commuteLocations || []) }, [JSON.stringify(props.commuteLocations || [])])

  function addCommuteLocation() {
    if (commuteLocations.length >= MAX_COMMUTE_LOCATIONS) return
    setCommuteLocations(prev => [...prev, {
      id: newLocationId(), label: '', address: '', timeLimit: null, mode: 'public',
    }])
  }
  function updateCommuteLocation(id: string, patch: Partial<CommuteLocation>) {
    setCommuteLocations(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }
  function removeCommuteLocation(id: string) {
    setCommuteLocations(prev => prev.filter(l => l.id !== id))
  }


  // Sync with URL params when they change (e.g. NavFilters updates URL)
  useEffect(() => { setRadius(props.radius || null) }, [props.radius])
  useEffect(() => { setAddedWithin(props.addedWithin || null) }, [props.addedWithin])
  useEffect(() => { setAvailableFrom(props.availableFrom || null) }, [props.availableFrom])
  const router = useRouter()

  const FEATURE_GROUPS = [
    { label: 'Outside space', options: ['Garden', 'Balcony', 'Terrace', 'Patio', 'Roof terrace'] },
    { label: 'Parking', options: ['Parking', 'Garage', 'Underground parking'] },
    { label: 'Character features', options: ['Fireplace', 'Bay windows', 'Sash windows', 'High ceilings', 'Period features', 'Exposed brick', 'Exposed beams', 'Parquet flooring', 'Wooden floors'] },
    { label: 'Lifestyle', options: ['Pets allowed', 'Bills included', 'Concierge', 'Lift', 'Gym', 'Swimming pool'] },
  ]
  const EXCLUDE_OPTIONS = ['New builds', 'Shared ownership', 'Retirement homes', 'Lower ground floor', 'Ground floor', 'Renovation needed', 'No floorplan']

  function toggleFeature(f: string) {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function applyFilters() {
    const p = new URLSearchParams()
    if (radius) p.set('radius', String(radius))
    if (addedWithin) p.set('addedWithin', String(addedWithin))
    if (availableFrom) p.set('availableFrom', availableFrom)
    if (availableFrom) p.set('availableFrom', availableFrom)
    if (props.location) p.set('location', props.location)
    p.set('type', props.listingType)
    if (minBeds) p.set('minBeds', String(minBeds))
    if (maxBeds) p.set('maxBeds', String(maxBeds))
    if (minPrice) p.set('minPrice', String(minPrice))
    if (maxPrice) p.set('maxPrice', String(maxPrice))
    if (furnished) p.set('furnished', furnished)
    if (propertyTypes.length > 0) p.set('propertyType', propertyTypes.join(','))
    if (features.length > 0) p.set('features', features.join(','))
    if (styles.length > 0) p.set('style', styles.join(','))
    if (minSize) p.set('minSize', String(minSize))
    // Always store price per sqm in URL (convert from sqft if needed)
    const ppsqmFactor = sizeUnit === 'sqft' ? 10.764 : 1
    if (minPricePerSqm) p.set('minPricePerSqm', String(Math.round(minPricePerSqm * ppsqmFactor)))
    if (maxPricePerSqm) p.set('maxPricePerSqm', String(Math.round(maxPricePerSqm * ppsqmFactor)))
    if (maxSize) p.set('maxSize', String(maxSize))
    if (minBaths) p.set('minBaths', String(minBaths))
    if (maxBaths) p.set('maxBaths', String(maxBaths))
    if (floorLayouts.length > 0) p.set('floorLayout', floorLayouts.join(','))
    // Legacy commuteAddress / maxCommute / commuteMode URL params removed — per-row time
    // limits + modes now live inside the encoded `commute=` param (set just below).

    if (tenures.length > 0) p.set('tenure', tenures.join(','))
    if (chainFree) p.set('chainFree', 'true')
    if (newBuild) p.set('newBuild', 'true')
    if (leaseholdMin) p.set('leaseholdMin', String(leaseholdMin))
    // Multi-location commute: serialize to URL and persist to user metadata so the locations
    // survive across sessions and other entry points (CommuteWidget on listing pages, account page).
    if (commuteLocations.length > 0) {
      const enc = serializeCommuteLocations(commuteLocations)
      if (enc) p.set('commute', enc)
    }
    fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commute_locations: commuteLocations })
    }).catch(() => {})
    setOpen(false)
    if (nestOnly) p.set('nestOnly', '1')
    if (onApply) { onApply(p) } else { router.push('/search?' + p.toString()) }
  }

  useImperativeHandle(ref, () => ({ applyNow: applyFilters }), [applyFilters])

  function clearFilters() {
    // Reset every piece of filter state.
    setStyles([])
    setMinBeds(null); setMaxBeds(null); setMinPrice(null); setMaxPrice(null)
    setAvailableFrom(null); setFurnished(null)
    setPropertyTypes([]); setFeatures([]); setRadius(null); setAddedWithin(null); setNestOnly(false)
    setTenures([]); setChainFree(false); setNewBuild(false); setLeaseholdMin(null)
    setFloorLayouts([])
    setMinSize(null); setMaxSize(null); setMinBaths(null); setMaxBaths(null)
    setMinPricePerSqm(null); setMaxPricePerSqm(null)
    setCommuteLocations([])
    window.dispatchEvent(new Event('nestlondon:clearFilters'))

    // Build a URL keeping ONLY the things that aren't filters (location + type).
    const p = new URLSearchParams()
    if (props.location) p.set('location', props.location)
    p.set('type', props.listingType)
    router.push('/search?' + p.toString())
  }

  const activeCount = [minBeds, maxBeds, minPrice, maxPrice, radius, furnished, addedWithin, availableFrom, minSize, maxSize, minBaths, maxBaths, maxPricePerSqm, minPricePerSqm].filter(Boolean).length + floorLayouts.length + propertyTypes.length + tenures.length + features.length + styles.length + (chainFree ? 1 : 0) + (newBuild ? 1 : 0) + (leaseholdMin ? 1 : 0) + commuteLocations.length

  useEffect(() => {
    function handleCloseAll() { setOpen(false) }
    function handleOutsideClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('nestlondon:closeDropdowns', handleCloseAll)
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      window.removeEventListener('nestlondon:closeDropdowns', handleCloseAll)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [open])

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => { if (!open) window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setOpen(!open) }}
        className={'flex items-center gap-2 text-sm px-3 py-2 h-11 bg-white border rounded-md whitespace-nowrap transition-colors ' + (activeCount > 0 ? 'border-[#D3755A] text-[#D3755A] font-medium' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A] hover:text-[#3D3A38]')}
      >
        {/* Sliders icon — matches the Zoopla "Filters" affordance */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4" y1="12" x2="20" y2="12" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="4" y1="18" x2="20" y2="18" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="6" r="2" fill="white" strokeWidth="1.5"/>
          <circle cx="15" cy="12" r="2" fill="white" strokeWidth="1.5"/>
          <circle cx="9" cy="18" r="2" fill="white" strokeWidth="1.5"/>
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#D3755A] text-white text-[10px] font-medium">{activeCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-7 w-96 bg-white border border-[#E8E2DA] rounded-2xl shadow-xl z-[200] p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-[#1C2B3A]">Filters</h3>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-[#4A5568] text-lg leading-none">x</button>
          </div>

          {!isBuy && (
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Available from</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAvailableFrom(new Date().toISOString().split('T')[0])}
                className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (availableFrom === new Date().toISOString().split('T')[0] ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                Now
              </button>
              <input
                type="date"
                value={availableFrom && availableFrom !== new Date().toISOString().split('T')[0] ? availableFrom : ''}
                onChange={e => setAvailableFrom(e.target.value || null)}
                min={new Date().toISOString().split('T')[0]}
                className={'flex-1 text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer outline-none ' + (availableFrom && availableFrom !== new Date().toISOString().split('T')[0] ? 'border-[#D3755A]' : 'border-[#E8E2DA] hover:border-[#D3755A]')}
                style={{
                  background: availableFrom && availableFrom !== new Date().toISOString().split('T')[0] ? '#D3755A' : '#F5EBE0',
                  color: availableFrom && availableFrom !== new Date().toISOString().split('T')[0] ? 'white' : '#3D3A38',
                  colorScheme: 'light',
                }}
              />
              {availableFrom && (
                <button onClick={() => setAvailableFrom(null)} className="text-stone-400 hover:text-[#4A5568] text-xs">✕</button>
              )}
            </div>
          </div>
          )}



          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Size</label>
              <div className="flex rounded-lg overflow-hidden border border-[#E8E2DA] text-xs">
                {(['sqft', 'sqm'] as const).map(u => (
                  <button key={u} onClick={() => { setSizeUnit(u); setMinSize(null); setMaxSize(null) }}
                    className={'px-2.5 py-1 transition-colors ' + (sizeUnit === u ? 'bg-[#D3755A] text-white' : 'bg-[#F5EBE0] text-stone-500')}>
                    {u === 'sqft' ? 'sq ft' : 'sq m'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <select value={minSize || ''} onChange={e => setMinSize(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No min</option>
                {(sizeUnit === 'sqft'
                  ? [200,300,400,500,600,700,800,900,1000,1250,1500,2000]
                  : [20,30,40,50,60,70,80,90,100,120,150,200]
                ).map(s => <option key={s} value={sizeUnit === 'sqm' ? Math.round(s * 10.764) : s}>{s.toLocaleString()} {sizeUnit === 'sqft' ? 'sq ft' : 'sq m'}</option>)}
              </select>
              <span className="text-xs text-[#9B928E]">to</span>
              <select value={maxSize || ''} onChange={e => setMaxSize(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No max</option>
                {(sizeUnit === 'sqft'
                  ? [200,300,400,500,600,700,800,900,1000,1250,1500,2000]
                  : [20,30,40,50,60,70,80,90,100,120,150,200]
                ).map(s => <option key={s} value={sizeUnit === 'sqm' ? Math.round(s * 10.764) : s}>{s.toLocaleString()} {sizeUnit === 'sqft' ? 'sq ft' : 'sq m'}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Price per {sizeUnit === 'sqft' ? 'sq ft' : 'sq m'}</label>
            <div className="flex gap-2 items-center">
              <select value={minPricePerSqm || ''} onChange={e => { setMinPricePerSqm(e.target.value ? Number(e.target.value) : null); setMaxPricePerSqm(null) }}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No min</option>
                {(sizeUnit === 'sqft'
                  ? [100,150,200,250,300,400,500,600,700,800,900,1000,1200,1500]
                  : [2000,3000,4000,5000,6000,7000,7500,8000,8500,9000,9500,10000,11000,12000,12500,15000,20000]
                ).map(v => <option key={v} value={v}>£{v.toLocaleString()}/{sizeUnit === 'sqft' ? 'ft²' : 'm²'}</option>)}
              </select>
              <span className="text-xs text-[#9B928E]">to</span>
              <select value={maxPricePerSqm || ''} onChange={e => setMaxPricePerSqm(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No max</option>
                {(sizeUnit === 'sqft'
                  ? [100,150,200,250,300,400,500,600,700,800,900,1000,1200,1500]
                  : [2000,3000,4000,5000,6000,7000,7500,8000,8500,9000,9500,10000,11000,12000,12500,15000,20000]
                ).map(v => <option key={v} value={v}>£{v.toLocaleString()}/{sizeUnit === 'sqft' ? 'ft²' : 'm²'}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Bathrooms</label>
            <div className="flex gap-2 items-center">
              <select value={minBaths || ''} onChange={e => setMinBaths(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No min</option>
                {[1,2,3,4,5].map(b => <option key={b} value={b}>{b}+</option>)}
              </select>
              <span className="text-xs text-[#9B928E]">to</span>
              <select value={maxBaths || ''} onChange={e => setMaxBaths(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No max</option>
                {[1,2,3,4,5].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Property type</label>
            <div className="flex flex-wrap gap-2">
              {['Flat','House','Terraced','Semi-Detached','Detached','End of Terrace','Studio','Penthouse','Town House','Maisonette','Mews','Bungalow'].map(t => (
                <button key={t} onClick={() => setPropertyTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (propertyTypes.includes(t) ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                >{t}</button>
              ))}
            </div>
          </div>

          {!isBuy && (
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Furnished</label>
            <div className="flex gap-2">
              {[['Furnished','furnished'],['Unfurnished','unfurnished'],['Part','part furnished']].map(([label, val]) => (
                <button key={val} onClick={() => setFurnished(furnished === val ? null : val)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ' + (furnished === val ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                >{label}</button>
              ))}
            </div>
          </div>
          )}

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Floor layout</label>
            <div className="flex flex-wrap gap-2">
              {['Single level', 'Split-level', 'Multiple floors'].map(opt => (
                <button key={opt} type="button" onClick={() => setFloorLayouts(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (floorLayouts.includes(opt) ? 'text-white border-transparent' : 'bg-[#F5EBE0] text-[#4A5568] border-[#E8E2DA] hover:border-[#D3755A]')}
                  style={floorLayouts.includes(opt) ? {background:'#D3755A'} : {}}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {isBuy && (
            <>
              <div className="mb-5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Tenure</label>
                <div className="flex flex-wrap gap-2">
                  {['Freehold','Leasehold','Share of freehold','Commonhold'].map(t => (
                    <button key={t} onClick={() => {
                      setTenures(prev => {
                        const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                        if (t === 'Leasehold' && !next.includes('Leasehold')) setLeaseholdMin(null)
                        return next
                      })
                    }}
                      className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (tenures.includes(t) ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {tenures.includes('Leasehold') && (
                <div className="mb-5">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Min lease remaining</label>
                  <div className="flex flex-wrap gap-2">
                    {[null, 50, 75, 100, 150].map(y => (
                      <button key={String(y)} onClick={() => setLeaseholdMin(y)}
                        className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (leaseholdMin === y ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                        {y === null ? 'Any' : y === 150 ? '150+ yrs' : y + ' yrs'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Other</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setChainFree(!chainFree)}
                    className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (chainFree ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                    Chain-free
                  </button>
                  <button onClick={() => setNewBuild(!newBuild)}
                    className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (newBuild ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                    New build
                  </button>
                </div>
              </div>
            </>
          )}

          {!isBuy && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Commute</label>
              <span className="text-[10px] text-[#9B928E]">{commuteLocations.length}/{MAX_COMMUTE_LOCATIONS} locations</span>
            </div>

            {/* Per-location rows */}
            {commuteLocations.length === 0 && (
              <p className="text-xs text-[#9B928E] mb-3">Add up to {MAX_COMMUTE_LOCATIONS} places you commute to — work, family, gym. Listings must meet every time limit.</p>
            )}

            <div className="flex flex-col gap-3 mb-3">
              {commuteLocations.map((loc, idx) => (
                <div key={loc.id} className="border border-[#E8E2DA] rounded-xl p-3 bg-[#FAFAF8]">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={loc.label}
                      onChange={e => updateCommuteLocation(loc.id, { label: e.target.value })}
                      placeholder={`Location ${idx + 1} (e.g. Work)`}
                      maxLength={40}
                      className="flex-1 border border-[#E8E2DA] rounded-lg px-2.5 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                    />
                    <button type="button" onClick={() => removeCommuteLocation(loc.id)}
                      className="text-[#9B928E] hover:text-red-500 transition-colors p-1 flex-shrink-0"
                      aria-label="Remove location">
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={loc.address}
                    onChange={e => updateCommuteLocation(loc.id, { address: e.target.value })}
                    placeholder="Postcode or station (e.g. EC1A 1BB)"
                    className="w-full border border-[#E8E2DA] rounded-lg px-2.5 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white mb-2"
                  />

                  {/* Per-location mode. Defaults to 'public' if undefined. */}
                  <div className="flex items-center gap-1 mb-2">
                    {([
                      { v: 'public' as const, label: 'Public', Icon: Bus },
                      { v: 'walk' as const, label: 'Walk', Icon: Footprints },
                      { v: 'bike' as const, label: 'Bike', Icon: Bike },
                    ]).map(({ v, label, Icon }) => {
                      const active = (loc.mode || 'public') === v
                      return (
                        <button key={v} type="button" onClick={() => updateCommuteLocation(loc.id, { mode: v })}
                          className={'flex-1 px-1.5 py-1 rounded-md text-[10px] inline-flex items-center justify-center gap-1 transition-colors ' + (active ? 'bg-[#1B2E4B] text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}>
                          <Icon className="w-3 h-3" strokeWidth={1.75} />
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#9B928E]">Max time</span>
                    <span className="text-[10px] font-semibold text-[#1B2E4B]">{loc.timeLimit ? loc.timeLimit + ' mins' : 'Any'}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={90}
                    step={5}
                    value={loc.timeLimit || 90}
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      updateCommuteLocation(loc.id, { timeLimit: v === 90 ? null : v })
                    }}
                    className="w-full range-fill accent-[#D3755A]"
                    style={{ ['--value' as any]: `${(((loc.timeLimit || 90) - 5) / 85) * 100}%` }}
                  />
                </div>
              ))}
            </div>

            <button type="button" onClick={addCommuteLocation}
              disabled={commuteLocations.length >= MAX_COMMUTE_LOCATIONS}
              className="w-full px-3 py-2 rounded-xl border border-dashed border-[#E8E2DA] text-xs text-[#9B928E] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              {commuteLocations.length === 0 ? 'Add a commute location' : commuteLocations.length >= MAX_COMMUTE_LOCATIONS ? `Maximum ${MAX_COMMUTE_LOCATIONS} locations` : 'Add another location'}
            </button>
          </div>
          )}

          <div className="mb-4">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Style</label>
            <div className="flex flex-wrap gap-2">
              {['Modern', 'Contemporary', 'Victorian', 'Georgian', 'Edwardian', 'Art Deco', 'Industrial', 'Minimalist', 'Period', 'New build', 'Converted', 'Loft'].map(s => (
                <button key={s} onClick={() => setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (styles.includes(s) ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {FEATURE_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">{group.label}</label>
              <div className="flex flex-wrap gap-2">
                {group.options.map(f => (
                  <button key={f} onClick={() => toggleFeature(f)}
                    className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (features.includes(f) ? 'bg-[#D3755A] text-white border-[#D3755A]' : 'bg-[#F5EBE0] text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                  >{f}</button>
                ))}
              </div>
            </div>
          ))}

          <div className="mb-6">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Exclude</label>
            <div className="flex flex-wrap gap-2">
              {EXCLUDE_OPTIONS.map(f => (
                <button key={f} onClick={() => toggleFeature('exclude:' + f)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (features.includes('exclude:' + f) ? 'bg-red-600 text-white border-red-600' : 'bg-[#F5F0EB] text-[#4A5568] border-[#E8E2DA] hover:border-red-400')}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="pt-2 pb-4 border-t border-[#E8E2DA]">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-600 mt-4">
              <input type="checkbox" checked={nestOnly} onChange={e => setNestOnly(e.target.checked)}
                className="w-4 h-4 accent-[#D3755A] cursor-pointer" />
              <span>Show NestLondon listings only</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={clearFilters} className="flex-1 border border-[#E8E2DA] text-[#4A5568] text-sm rounded-xl py-2.5 hover:border-stone-300 transition-colors">Clear all</button>
            <button onClick={applyFilters} className="flex-1 text-white text-sm rounded-xl py-2.5 transition-opacity hover:opacity-90" style={{background:'#D3755A'}}>{onApply ? 'Add' : 'Show results'}</button>
          </div>
        </div>
      )}
    </div>
  )
})

export default SearchFilters
