'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
}

export default function SearchFilters(props: Props) {
  const [open, setOpen] = useState(false)
  const [minBeds, setMinBeds] = useState(props.minBeds)
  const [maxBeds, setMaxBeds] = useState(props.maxBeds)
  const [minPrice, setMinPrice] = useState(props.minPrice)
  const [maxPrice, setMaxPrice] = useState(props.maxPrice)
  const [furnished, setFurnished] = useState(props.furnished)
  const [propertyType, setPropertyType] = useState(props.propertyType)
  const [features, setFeatures] = useState<string[]>(props.features)
  const [radius, setRadius] = useState<number | null>(props.radius || null)
  const router = useRouter()

  const FEATURE_OPTIONS = ['Garden', 'Balcony', 'Parking', 'Garage', 'Pets allowed', 'Bills included']
  const EXCLUDE_OPTIONS = ['New builds', 'Shared ownership', 'Retirement homes']

  function toggleFeature(f: string) {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function applyFilters() {
    const p = new URLSearchParams()
    if (radius) p.set('radius', String(radius))
    if (props.location) p.set('location', props.location)
    p.set('type', props.listingType)
    if (minBeds) p.set('minBeds', String(minBeds))
    if (maxBeds) p.set('maxBeds', String(maxBeds))
    if (minPrice) p.set('minPrice', String(minPrice))
    if (maxPrice) p.set('maxPrice', String(maxPrice))
    if (furnished) p.set('furnished', furnished)
    if (propertyType) p.set('propertyType', propertyType)
    if (features.length > 0) p.set('features', features.join(','))
    setOpen(false)
    router.push('/search?' + p.toString())
  }

  function clearFilters() {
    setMinBeds(null); setMaxBeds(null); setMinPrice(null); setMaxPrice(null)
    setFurnished(null); setPropertyType(null); setFeatures([]); setRadius(null)
    const p = new URLSearchParams()
    if (radius) p.set('radius', String(radius))
    if (props.location) p.set('location', props.location)
    p.set('type', props.listingType)
    router.push('/search?' + p.toString())
    setOpen(false)
  }

  const activeCount = [minBeds, maxBeds, minPrice, maxPrice, furnished, propertyType, radius].filter(Boolean).length + features.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={'flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-colors ' + (activeCount > 0 ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-600')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.5"/><line x1="11" y1="18" x2="13" y2="18" strokeWidth="1.5"/></svg>
        Filters
        {activeCount > 0 && <span className="bg-white text-orange-700 text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">{activeCount}</span>}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-stone-800">Filters</h3>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-lg leading-none">x</button>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Within distance</label>
            <div className="flex gap-2 flex-wrap">
              {[null, 0.5, 1, 2, 5, 10].map(r => (
                <button key={String(r)} onClick={() => setRadius(r)}
                  className={'px-3 py-2 text-xs rounded-lg border transition-colors ' + (radius === r ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-orange-600')}
                >{r === null ? 'Any' : r + ' mi'}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Bedrooms</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(b => (
                <button key={b} onClick={() => setMinBeds(minBeds === b ? null : b)}
                  className={'flex-1 py-2 text-xs rounded-lg border transition-colors ' + (minBeds === b ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-orange-600')}
                >{b}+</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Monthly rent</label>
            <div className="flex gap-2 items-center">
              <select value={minPrice || ''} onChange={e => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-stone-200 rounded-lg px-2 py-2 text-xs text-stone-700 outline-none">
                <option value="">No min</option>
                {[500,750,1000,1250,1500,1750,2000,2500,3000,4000,5000].map(p => (
                  <option key={p} value={p}>£{p.toLocaleString()}</option>
                ))}
              </select>
              <span className="text-stone-400 text-xs">to</span>
              <select value={maxPrice || ''} onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 border border-stone-200 rounded-lg px-2 py-2 text-xs text-stone-700 outline-none">
                <option value="">No max</option>
                {[750,1000,1250,1500,1750,2000,2500,3000,4000,5000,7500,10000].map(p => (
                  <option key={p} value={p}>£{p.toLocaleString()}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Property type</label>
            <div className="flex flex-wrap gap-2">
              {['Flat','House','Studio','Maisonette','Bungalow'].map(t => (
                <button key={t} onClick={() => setPropertyType(propertyType === t ? null : t)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (propertyType === t ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-orange-600')}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Furnished</label>
            <div className="flex gap-2">
              {[['Furnished','furnished'],['Unfurnished','unfurnished'],['Part','part furnished']].map(([label, val]) => (
                <button key={val} onClick={() => setFurnished(furnished === val ? null : val)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors flex-1 ' + (furnished === val ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-orange-600')}
                >{label}</button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Must have</label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map(f => (
                <button key={f} onClick={() => toggleFeature(f)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (features.includes(f) ? 'bg-orange-700 text-white border-orange-700' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-orange-600')}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Exclude</label>
            <div className="flex flex-wrap gap-2">
              {EXCLUDE_OPTIONS.map(f => (
                <button key={f} onClick={() => toggleFeature('exclude:' + f)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (features.includes('exclude:' + f) ? 'bg-red-600 text-white border-red-600' : 'bg-[#F1EFE8] text-stone-600 border-stone-200 hover:border-red-400')}
                >{f}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={clearFilters} className="flex-1 border border-stone-200 text-stone-600 text-sm rounded-xl py-2.5 hover:border-stone-300 transition-colors">Clear all</button>
            <button onClick={applyFilters} className="flex-1 bg-orange-700 text-white text-sm rounded-xl py-2.5 hover:bg-orange-800 transition-colors">Show results</button>
          </div>
        </div>
      )}
    </div>
  )
}
