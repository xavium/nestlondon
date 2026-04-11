'use client'

import { useState, useEffect } from 'react'
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
  radius?: number | null
  addedWithin?: number | null
  availableFrom?: string | null
  onApply?: (params: URLSearchParams) => void
}

export default function SearchFilters(props: Props) {
  const { onApply } = props
  const [open, setOpen] = useState(false)
  const sp = useSearchParams()
  const [minBeds, setMinBeds] = useState<number | null>(sp.get('minBeds') ? parseInt(sp.get('minBeds')!) : null)
  const [maxBeds, setMaxBeds] = useState<number | null>(sp.get('maxBeds') ? parseInt(sp.get('maxBeds')!) : null)
  const [minPrice, setMinPrice] = useState<number | null>(sp.get('minPrice') ? parseInt(sp.get('minPrice')!) : null)
  const [maxPrice, setMaxPrice] = useState<number | null>(sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!) : null)
  const [furnished, setFurnished] = useState(props.furnished)
  const [propertyType, setPropertyType] = useState(props.propertyType)
  const [features, setFeatures] = useState<string[]>(props.features)
  const [radius, setRadius] = useState<number | null>(sp.get('radius') ? parseFloat(sp.get('radius')!) : null)
  const [addedWithin, setAddedWithin] = useState<number | null>(props.addedWithin || null)
  const [minSize, setMinSize] = useState<number | null>(null)
  const [maxSize, setMaxSize] = useState<number | null>(null)
  const [minFloors, setMinFloors] = useState<number | null>(null)
  const [maxFloors, setMaxFloors] = useState<number | null>(null)
  const [availableFrom, setAvailableFrom] = useState<string | null>(props.availableFrom || null)

  // Sync with URL params when they change (e.g. NavFilters updates URL)
  useEffect(() => { setRadius(props.radius || null) }, [props.radius])
  useEffect(() => { setAddedWithin(props.addedWithin || null) }, [props.addedWithin])
  useEffect(() => { setAvailableFrom(props.availableFrom || null) }, [props.availableFrom])
  const router = useRouter()

  const FEATURE_OPTIONS = ['Garden', 'Balcony', 'Parking', 'Garage', 'Pets allowed', 'Bills included']
  const EXCLUDE_OPTIONS = ['New builds', 'Shared ownership', 'Retirement homes', 'Lower ground floor']

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
    if (propertyType) p.set('propertyType', propertyType)
    if (features.length > 0) p.set('features', features.join(','))
    if (minSize) p.set('minSize', String(minSize))
    if (maxSize) p.set('maxSize', String(maxSize))
    if (minFloors) p.set('minFloors', String(minFloors))
    if (maxFloors) p.set('maxFloors', String(maxFloors))
    setOpen(false)
    if (onApply) { onApply(p) } else { router.push('/search?' + p.toString()) }
  }

  function clearFilters() {
    window.dispatchEvent(new Event('nestlondon:clearFilters'))
    setMinBeds(null); setMaxBeds(null); setMinPrice(null); setMaxPrice(null); setAvailableFrom(null); setAvailableFrom(null)
    setFurnished(null); setPropertyType(null); setFeatures([]); setRadius(null); setAddedWithin(null)
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

  const activeCount = [minBeds, maxBeds, minPrice, maxPrice, radius, furnished, propertyType, addedWithin, availableFrom, minSize, maxSize, minFloors, maxFloors].filter(Boolean).length + features.length

  useEffect(() => {
    function handleCloseAll() { setOpen(false) }
    window.addEventListener('nestlondon:closeDropdowns', handleCloseAll)
    return () => window.removeEventListener('nestlondon:closeDropdowns', handleCloseAll)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => { if (!open) window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setOpen(!open) }}
        className={'flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-colors ' + (activeCount > 0 ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-[#4A5568] border-[#E8E2DA] hover:border-orange-600')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5"/><line x1="11" y1="18" x2="13" y2="18" strokeWidth="1.5"/></svg>
        Filters
        {activeCount > 0 && <span className="bg-white text-orange-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">{activeCount}</span>}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-[#E8E2DA] rounded-2xl shadow-xl z-[200] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-[#1C2B3A]">Filters</h3>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-[#4A5568] text-lg leading-none">x</button>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Available from</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={availableFrom || ''}
                onChange={e => setAvailableFrom(e.target.value || null)}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#374151] bg-[#F5F0EB] outline-none"
              />
              {availableFrom && (
                <button onClick={() => setAvailableFrom(null)} className="text-stone-400 hover:text-[#4A5568] text-xs">✕</button>
              )}
            </div>
          </div>



          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Size (sq ft)</label>
            <div className="flex gap-2 items-center">
              <select value={minSize || ''} onChange={e => { setMinSize(e.target.value ? Number(e.target.value) : null) }}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No min</option>
                {[200,300,400,500,600,700,800,900,1000,1250,1500,2000].map(s => (
                  <option key={s} value={s}>{s.toLocaleString()} sq ft</option>
                ))}
              </select>
              <span className="text-xs text-[#9B928E]">to</span>
              <select value={maxSize || ''} onChange={e => { setMaxSize(e.target.value ? Number(e.target.value) : null) }}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No max</option>
                {[200,300,400,500,600,700,800,900,1000,1250,1500,2000].map(s => (
                  <option key={s} value={s}>{s.toLocaleString()} sq ft</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Number of floors</label>
            <div className="flex gap-2 items-center">
              <select value={minFloors || ''} onChange={e => { setMinFloors(e.target.value ? Number(e.target.value) : null) }}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No min</option>
                {[1,2,3,4,5].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <span className="text-xs text-[#9B928E]">to</span>
              <select value={maxFloors || ''} onChange={e => { setMaxFloors(e.target.value ? Number(e.target.value) : null) }}
                className="flex-1 border border-[#E8E2DA] rounded-lg px-2 py-2 text-xs text-[#3D3A38] bg-[#F5EBE0] outline-none">
                <option value="">No max</option>
                {[1,2,3,4,5].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Property type</label>
            <div className="flex flex-wrap gap-2">
              {['Flat','House','Studio','Maisonette','Bungalow'].map(t => (
                <button key={t} onClick={() => setPropertyType(propertyType === t ? null : t)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (propertyType === t ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F5F0EB] text-[#4A5568] border-[#E8E2DA] hover:border-orange-600')}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Furnished</label>
            <div className="flex gap-2">
              {[['Furnished','furnished'],['Unfurnished','unfurnished'],['Part','part furnished']].map(([label, val]) => (
                <button key={val} onClick={() => setFurnished(furnished === val ? null : val)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ' + (furnished === val ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F5F0EB] text-[#4A5568] border-[#E8E2DA] hover:border-orange-600')}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Must have</label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map(f => (
                <button key={f} onClick={() => toggleFeature(f)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (features.includes(f) ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F5F0EB] text-[#4A5568] border-[#E8E2DA] hover:border-orange-600')}
                >{f}</button>
              ))}
            </div>
          </div>

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

          <div className="flex gap-3">
            <button onClick={clearFilters} className="flex-1 border border-[#E8E2DA] text-[#4A5568] text-sm rounded-xl py-2.5 hover:border-stone-300 transition-colors">Clear all</button>
            <button onClick={applyFilters} className="flex-1 bg-orange-700 text-white text-sm rounded-xl py-2.5 hover:bg-orange-800 transition-colors">{onApply ? 'Add' : 'Show results'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
