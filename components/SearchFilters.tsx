'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  commuteAddress?: string
  maxCommute?: number | null
  tenure?: string | null
  chainFree?: boolean
  newBuild?: boolean
  leaseholdMin?: number | null
  minBaths?: number | null
  maxBaths?: number | null
  maxPricePerSqm?: number | null
  minPricePerSqm?: number | null
}

export interface SearchFiltersHandle {
  applyNow: () => void
}

const SearchFilters = forwardRef<SearchFiltersHandle, Props>(function SearchFilters(props, ref) {
  const { onApply } = props
  const isBuy = props.listingType === 'buy'
  const [open, setOpen] = useState(false)
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
  const [commuteAddress, setCommuteAddress] = useState<string>(sp.get('commuteAddress') || props.commuteAddress || '')
  const [maxCommute, setMaxCommute] = useState<number | null>(sp.get('maxCommute') ? parseInt(sp.get('maxCommute')!) : (props.maxCommute || null))
  const [editingCommute, setEditingCommute] = useState(false)
  const [commuteDraft, setCommuteDraft] = useState(sp.get('commuteAddress') || props.commuteAddress || '')
  const [tenures, setTenures] = useState<string[]>(sp.get('tenure') ? sp.get('tenure')!.split(',') : (props.tenure ? [props.tenure] : []))
  const [chainFree, setChainFree] = useState<boolean>(sp.get('chainFree') === 'true' || props.chainFree || false)
  const [newBuild, setNewBuild] = useState<boolean>(sp.get('newBuild') === 'true' || props.newBuild || false)
  const [leaseholdMin, setLeaseholdMin] = useState<number | null>(sp.get('leaseholdMin') ? parseInt(sp.get('leaseholdMin')!) : (props.leaseholdMin || null))

  // Sync commute address from profile if not in URL
  useEffect(() => {
    if (!sp.get('commuteAddress') && props.commuteAddress) {
      setCommuteAddress(props.commuteAddress)
      setCommuteDraft(props.commuteAddress)
    }
  }, [props.commuteAddress])

  // Sync with URL params when they change (e.g. NavFilters updates URL)
  useEffect(() => { setRadius(props.radius || null) }, [props.radius])
  useEffect(() => { setAddedWithin(props.addedWithin || null) }, [props.addedWithin])
  useEffect(() => { setAvailableFrom(props.availableFrom || null) }, [props.availableFrom])
  const router = useRouter()

  const FEATURE_GROUPS = [
    { label: 'Outside space', options: ['Garden', 'Balcony', 'Terrace', 'Patio', 'Roof terrace'] },
    { label: 'Parking', options: ['Parking', 'Garage', 'Underground parking'] },
    { label: 'Character features', options: ['Fireplace', 'Bay windows', 'Sash windows', 'High ceilings', 'Period features', 'Exposed brick', 'Exposed beams', 'Parquet flooring', 'Wooden floors'] },
    { label: 'Lifestyle', options: ['Pets allowed', 'Bills included', 'Concierge', 'Gym', 'Swimming pool'] },
  ]
  const EXCLUDE_OPTIONS = ['New builds', 'Shared ownership', 'Retirement homes', 'Lower ground floor', 'Ground floor', 'Renovation needed']

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
    if (commuteAddress && maxCommute) { p.set('commuteAddress', commuteAddress); p.set('maxCommute', String(maxCommute)) }
    if (tenures.length > 0) p.set('tenure', tenures.join(','))
    if (chainFree) p.set('chainFree', 'true')
    if (newBuild) p.set('newBuild', 'true')
    if (leaseholdMin) p.set('leaseholdMin', String(leaseholdMin))
    setOpen(false)
    if (nestOnly) p.set('nestOnly', '1')
    if (onApply) { onApply(p) } else { router.push('/search?' + p.toString()) }
  }

  useImperativeHandle(ref, () => ({ applyNow: applyFilters }), [applyFilters])

  function clearFilters() {
    setStyles([])
    window.dispatchEvent(new Event('nestlondon:clearFilters'))
    setMinBeds(null); setMaxBeds(null); setMinPrice(null); setMaxPrice(null); setAvailableFrom(null); setAvailableFrom(null)
    setFurnished(null); setPropertyTypes([]); setFeatures([]); setRadius(null); setAddedWithin(null); setNestOnly(false)
    const p = new URLSearchParams()
    if (radius) p.set('radius', String(radius))
    if (addedWithin) p.set('addedWithin', String(addedWithin))
    if (availableFrom) p.set('availableFrom', availableFrom)
    if (availableFrom) p.set('availableFrom', availableFrom)
    if (props.location) p.set('location', props.location)
    p.set('type', props.listingType)
    router.push('/search?' + p.toString())
    setOpen(false)
  }

  const activeCount = [minBeds, maxBeds, minPrice, maxPrice, radius, furnished, addedWithin, availableFrom, minSize, maxSize, minBaths, maxBaths, maxPricePerSqm, minPricePerSqm].filter(Boolean).length + floorLayouts.length + propertyTypes.length + tenures.length + features.length + styles.length + (maxCommute ? 1 : 0) + (chainFree ? 1 : 0) + (newBuild ? 1 : 0) + (leaseholdMin ? 1 : 0)

  useEffect(() => {
    function handleCloseAll() { setOpen(false) }
    window.addEventListener('nestlondon:closeDropdowns', handleCloseAll)
    return () => window.removeEventListener('nestlondon:closeDropdowns', handleCloseAll)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => { if (!open) window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setOpen(!open) }}
        className={'flex items-center gap-1.5 text-sm px-3 whitespace-nowrap transition-colors ' + (activeCount > 0 ? 'text-[#D3755A] font-medium' : 'text-[#9B928E] hover:text-[#3D3A38]')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5"/><line x1="11" y1="18" x2="13" y2="18" strokeWidth="1.5"/></svg>
        Filters
        {activeCount > 0 && <span className="bg-white text-[#D3755A] text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">{activeCount}</span>}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-[#E8E2DA] rounded-2xl shadow-xl z-[200] p-6 max-h-[80vh] overflow-y-auto max-h-[80vh] overflow-y-auto">
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
              {['Flat','House','Studio','Maisonette','Bungalow'].map(t => (
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
                    <button key={t} onClick={() => setTenures(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
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
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Commute time</label>
            {commuteAddress && !editingCommute ? (
              <div className="flex items-center gap-2 bg-[#F5EBE0] rounded-xl px-3 py-2 mb-3">
                <span className="text-xs text-[#1B2E4B] flex-1 truncate">📍 {commuteAddress}</span>
                <button onClick={() => { setEditingCommute(true); setCommuteDraft(commuteAddress) }}
                  className="text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={commuteDraft}
                  onChange={e => setCommuteDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setCommuteAddress(commuteDraft); setEditingCommute(false) } if (e.key === 'Escape') setEditingCommute(false) }}
                  placeholder="Work postcode or station (e.g. EC1A 1BB)"
                  className="flex-1 border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                />
                <button onClick={async () => {
                  setCommuteAddress(commuteDraft)
                  setEditingCommute(false)
                  fetch('/api/commute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commute_address: commuteDraft })
                  }).catch(() => {})
                }}
                  className="px-3 py-1.5 rounded-xl text-white text-xs flex-shrink-0"
                  style={{background:'#D3755A'}}>
                  Set
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#9B928E]">Max commute time</span>
              <span className="text-xs font-semibold text-[#1B2E4B]">{maxCommute ? maxCommute + ' mins' : 'Any'}</span>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              value={maxCommute || 90}
              onChange={e => setMaxCommute(parseInt(e.target.value) === 90 ? null : parseInt(e.target.value))}
              className="w-full range-fill accent-[#D3755A]"
              style={{ ['--value' as any]: `${(((maxCommute || 90) - 5) / 85) * 100}%` }}
            />
            <div className="flex justify-between text-[10px] text-[#9B928E] mt-1">
              <span>5 min</span>
              <span>30 min</span>
              <span>60 min</span>
              <span>Any</span>
            </div>
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
