'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  location: string
  listingType: string
  minBeds: number | null
  maxBeds: number | null
  minPrice: number | null
  maxPrice: number | null
  radius: number | null
  addedWithin?: number | null
  immediate?: boolean  // if false, just update state without navigating
  onFilterChange?: (filters: Record<string, number | null>) => void
}

function Dropdown({ label, active, open, onToggle, children }: { label: string, active: boolean, open: boolean, onToggle: () => void, children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle && open && onToggle()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={'flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors whitespace-nowrap ' +
          (active ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-[#4A5568] border-[#E8E2DA] hover:border-orange-600')}
      >
        {label}
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-[#E8E2DA] rounded-xl shadow-lg z-50 p-3 min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  )
}

export default function NavFilters({ location, listingType, minBeds, maxBeds, minPrice, maxPrice, radius, addedWithin = null, immediate = true, onFilterChange }: Props) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [localAddedWithin, setLocalAddedWithin] = useState<number | null>(addedWithin)

  useEffect(() => {
    function handleCloseAll() { setActiveDropdown(null) }
    window.addEventListener('nestlondon:closeDropdowns', handleCloseAll)
    return () => window.removeEventListener('nestlondon:closeDropdowns', handleCloseAll)
  }, [])

  useEffect(() => {
    function handleClear() {
      setLocalMinBeds(null)
      setLocalMaxBeds(null)
      setLocalMinPrice(null)
      setLocalMaxPrice(null)
      setLocalAddedWithin(null)
      setActiveDropdown(null)
    }
    window.addEventListener('nestlondon:clearFilters', handleClear)
    return () => window.removeEventListener('nestlondon:clearFilters', handleClear)
  }, [])
  const [localMinBeds, setLocalMinBeds] = useState(minBeds)
  const [localMaxBeds, setLocalMaxBeds] = useState(maxBeds)
  const [localMinPrice, setLocalMinPrice] = useState(minPrice)
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice)
  const router = useRouter()

  function push(overrides: Record<string, number | null>) {
    const aw = overrides.addedWithin !== undefined ? overrides.addedWithin : localAddedWithin
    const minB = overrides.minBeds !== undefined ? overrides.minBeds : localMinBeds
    const maxB = overrides.maxBeds !== undefined ? overrides.maxBeds : localMaxBeds
    const minP = overrides.minPrice !== undefined ? overrides.minPrice : localMinPrice
    const maxP = overrides.maxPrice !== undefined ? overrides.maxPrice : localMaxPrice
    if (onFilterChange) onFilterChange({ minBeds: minB, maxBeds: maxB, minPrice: minP, maxPrice: maxP, addedWithin: aw })
    if (!immediate) return
    const p = new URLSearchParams()
    p.set('type', listingType)
    if (location) p.set('location', location)
    if (aw) p.set('addedWithin', String(aw))
    if (minB) p.set('minBeds', String(minB))
    if (maxB) p.set('maxBeds', String(maxB))
    if (minP) p.set('minPrice', String(minP))
    if (maxP) p.set('maxPrice', String(maxP))
    router.push('/search?' + p.toString())
  }

  const addedWithinLabel = localAddedWithin ? (localAddedWithin === 1 ? 'Last 24 hours' : localAddedWithin === 30 ? 'Last month' : localAddedWithin === 90 ? 'Last 3 months' : `Last ${localAddedWithin} days`) : 'Added within'
  const priceLabel = localMinPrice || localMaxPrice
    ? [localMinPrice ? '£' + localMinPrice.toLocaleString() : 'Min', localMaxPrice ? '£' + localMaxPrice.toLocaleString() : 'Max'].join(' – ')
    : 'Price'
  const bedsLabel = localMinBeds || localMaxBeds
    ? [localMinBeds ?? 'Min', localMaxBeds ?? 'Max'].join(' – ') + ' beds'
    : 'Beds'

  return (
    <div className="flex items-center gap-2">

      {/* Min Price */}
      <Dropdown label={localMinPrice ? '£' + localMinPrice.toLocaleString() : 'Min Price'} active={!!localMinPrice} open={activeDropdown === 'minPrice'} onToggle={() => { if (activeDropdown !== 'minPrice') window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActiveDropdown(activeDropdown === 'minPrice' ? null : 'minPrice') }}>
        <div className="flex flex-col gap-1">
          {([null,500,750,1000,1250,1500,1750,2000,2500,3000,4000,5000] as (number|null)[]).map(p => (
            <button key={String(p)} onClick={() => { setLocalMinPrice(p); push({ minPrice: p }) }}
              className={'text-left text-sm px-2 py-1.5 rounded-lg transition-colors ' + (localMinPrice === p ? 'bg-orange-700 text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
            >{p === null ? 'No min' : '£' + p.toLocaleString()}</button>
          ))}
        </div>
      </Dropdown>

      <span className="text-xs text-stone-400">to</span>
      {/* Max Price */}
      <Dropdown label={localMaxPrice ? '£' + localMaxPrice.toLocaleString() : 'Max Price'} active={!!localMaxPrice} open={activeDropdown === 'maxPrice'} onToggle={() => { if (activeDropdown !== 'maxPrice') window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActiveDropdown(activeDropdown === 'maxPrice' ? null : 'maxPrice') }}>
        <div className="flex flex-col gap-1">
          {([null,500,750,1000,1250,1500,1750,2000,2500,3000,4000,5000] as (number|null)[]).map(p => (
            <button key={String(p)} onClick={() => { setLocalMaxPrice(p); push({ maxPrice: p }) }}
              className={'text-left text-sm px-2 py-1.5 rounded-lg transition-colors ' + (localMaxPrice === p ? 'bg-orange-700 text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
            >{p === null ? 'No max' : '£' + p.toLocaleString()}</button>
          ))}
        </div>
      </Dropdown>

      {/* Min Beds */}
      <Dropdown label={localMinBeds === 0 ? 'Studio' : localMinBeds ? localMinBeds + ' Beds' : 'Min Beds'} active={localMinBeds !== null} open={activeDropdown === 'minBeds'} onToggle={() => { if (activeDropdown !== 'minBeds') window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActiveDropdown(activeDropdown === 'minBeds' ? null : 'minBeds') }}>
        <div className="flex flex-col gap-1">
          {([null,0,1,2,3,4,5] as (number|null)[]).map(b => (
            <button key={String(b)} onClick={() => { setLocalMinBeds(b); push({ minBeds: b }) }}
              className={'text-left text-sm px-2 py-1.5 rounded-lg transition-colors ' + (localMinBeds === b ? 'bg-orange-700 text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
            >{b === null ? 'No min' : b === 0 ? 'Studio' : b + ' bed' + (b > 1 ? 's' : '')}</button>
          ))}
        </div>
      </Dropdown>

      <span className="text-xs text-stone-400">to</span>
      {/* Max Beds */}
      <Dropdown label={localMaxBeds === 0 ? 'Studio' : localMaxBeds ? localMaxBeds + ' Beds' : 'Max Beds'} active={localMaxBeds !== null} open={activeDropdown === 'maxBeds'} onToggle={() => { if (activeDropdown !== 'maxBeds') window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActiveDropdown(activeDropdown === 'maxBeds' ? null : 'maxBeds') }}>
        <div className="flex flex-col gap-1">
          {([null,0,1,2,3,4,5] as (number|null)[]).map(b => (
            <button key={String(b)} onClick={() => { setLocalMaxBeds(b); push({ maxBeds: b }) }}
              className={'text-left text-sm px-2 py-1.5 rounded-lg transition-colors ' + (localMaxBeds === b ? 'bg-orange-700 text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
            >{b === null ? 'No max' : b === 0 ? 'Studio' : b + ' bed' + (b > 1 ? 's' : '')}</button>
          ))}
        </div>
      </Dropdown>




      {/* Added within */}
      <Dropdown label={addedWithinLabel} active={!!localAddedWithin} open={activeDropdown === 'addedWithin'} onToggle={() => { if (activeDropdown !== 'addedWithin') window.dispatchEvent(new Event('nestlondon:closeDropdowns')); setActiveDropdown(activeDropdown === 'addedWithin' ? null : 'addedWithin') }}>
        <div className="flex flex-col gap-1">
          {([null, 1, 3, 7, 14, 30, 90] as (number | null)[]).map(d => (
            <button key={String(d)}
              onClick={() => { setLocalAddedWithin(d); push({ addedWithin: d }) }}
              className={'text-left text-sm px-2 py-1.5 rounded-lg transition-colors ' + (localAddedWithin === d ? 'bg-orange-700 text-white' : 'hover:bg-[#F5F0EB] text-[#374151]')}
            >{d === null ? 'Any time' : d === 1 ? '24 hours' : d === 30 ? '1 month' : d === 90 ? '3 months' : `${d} days`}</button>
          ))}
        </div>
      </Dropdown>

    </div>
  )
}
