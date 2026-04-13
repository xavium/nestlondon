'use client'

import { useState, useEffect } from 'react'
import SearchMapView from '@/components/SearchMapView'
import SaveSearchButton from '@/components/SaveSearchButton'
import ListingCard from '@/components/ListingCard'

interface Coords { lat: number, lng: number }

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function ViewToggle({ view, setView }: { view: string, setView: (v: 'grid' | 'map') => void }) {
  function switchView(v: 'grid' | 'map') {
    setView(v)
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      if (v === 'map') sp.set('view', 'map')
      else sp.delete('view')
      window.history.replaceState(null, '', '/search?' + sp.toString())
    }
  }
  return (
    <div className="flex items-center bg-stone-100 rounded-lg p-1 gap-1">
      <button onClick={() => switchView('grid')}
        className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' + (view === 'grid' ? 'bg-white text-[#374151] shadow-sm' : 'text-stone-500')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        List
      </button>
      <button onClick={() => switchView('map')}
        className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' + (view === 'map' ? 'bg-white text-[#374151] shadow-sm' : 'text-stone-500')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 20l-5-2V4l5 2m0 14l6-2m-6 2V6m6 12l5 2V6l-5-2m0 14V4"/></svg>
        Map
      </button>
    </div>
  )
}

export function SearchResults({ filtered, allListings, allListingsForMap, radius, locationCoords, location, minBeds, maxBeds, minPrice, maxPrice }: {
  filtered: any[]
  allListings: any[]
  allListingsForMap: any[]
  radius?: number | null
  locationCoords?: Coords | null
  location?: string
  minBeds?: number | null
  maxBeds?: number | null
  minPrice?: number | null
  maxPrice?: number | null
}) {
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [viewReady, setViewReady] = useState(false)
  const [sortBy, setSortBy] = useState<'relevant' | 'newest' | 'price_asc' | 'price_desc' | 'nearest' | 'size_asc' | 'size_desc' | 'psqm_desc' | 'psqm_asc'>('relevant')

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('view') === 'map') setView('map')
    setViewReady(true)
  }, [])

  // Split: inRadius = within selected radius (or 0.5mi default)
  //        nearby   = everything else sorted by distance
  const splitRadius = radius ?? (locationCoords ? 0.25 : null)
  let inRadius = filtered
  let nearby: any[] = []

  if (locationCoords && splitRadius) {
    const splitMetres = splitRadius * 1609.34

    // Add distance to all listings
    const withDist = (l: any) => ({
      ...l,
      _dist: haversineM(locationCoords.lat, locationCoords.lng, parseFloat(l.latitude), parseFloat(l.longitude))
    })

    // inRadius: filtered listings within radius
    inRadius = filtered
      .filter((l: any) => l.latitude && l.longitude)
      .map(withDist)
      .filter((l: any) => l._dist <= splitMetres)
      .sort((a: any, b: any) => a._dist - b._dist)

    // nearby: allListings outside radius, with basic filter criteria applied
    const inRadiusIds = new Set(inRadius.map((l: any) => l.id))
    const sp = new URLSearchParams(window.location.search)
    const nbMinBeds = sp.get('minBeds') ? parseInt(sp.get('minBeds')!) : null
    const nbMaxBeds = sp.get('maxBeds') ? parseInt(sp.get('maxBeds')!) : null
    const nbMinPrice = sp.get('minPrice') ? parseInt(sp.get('minPrice')!) : null
    const nbMaxPrice = sp.get('maxPrice') ? parseInt(sp.get('maxPrice')!) : null
    nearby = allListings
      .filter((l: any) => {
        if (!l.latitude || !l.longitude) return false
        if (inRadiusIds.has(l.id)) return false
        const beds = l.bedrooms != null ? parseInt(l.bedrooms) : null
        const price = l.price != null ? parseInt(l.price) : null
        if (nbMinBeds && (beds == null || beds < nbMinBeds)) return false
        if (nbMaxBeds && (beds == null || beds > nbMaxBeds)) return false
        if (nbMinPrice && (price == null || price < nbMinPrice)) return false
        if (nbMaxPrice && (price == null || price > nbMaxPrice)) return false
        return true
      })
      .map(withDist)
      .sort((a: any, b: any) => a._dist - b._dist)
      .slice(0, 12)
  }

  // Apply sort
  const sortedResults = [...inRadius].sort((a: any, b: any) => {
    if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0)
    if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0)
    if (sortBy === 'nearest' && a._dist != null && b._dist != null) return a._dist - b._dist
    if (sortBy === 'newest') return new Date(b.scraped_at || 0).getTime() - new Date(a.scraped_at || 0).getTime()
    if (sortBy === 'size_asc') {
      const getSqft = (l: any) => {
        try {
          const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data) : (l.raw_data || {})
          const txt = rd?.size_text || l.description || ''
          const m = txt.match(/([\d,]+)\s*sq\s*ft/i)
          return m ? parseFloat(m[1].replace(',','')) : 0
        } catch { return 0 }
      }
      return getSqft(a) - getSqft(b)
    }
    if (sortBy === 'size_desc') {
      const getSqft2 = (l: any) => {
        try {
          const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data) : (l.raw_data || {})
          const txt = rd?.size_text || l.description || ''
          const m = txt.match(/([\d,]+)\s*sq\s*ft/i)
          return m ? parseFloat(m[1].replace(',','')) : 0
        } catch { return 0 }
      }
      return getSqft2(b) - getSqft2(a)
    }
    if (sortBy === 'psqm_desc') {
      const getPsqm = (l: any) => {
        try {
          const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data) : (l.raw_data || {})
          const txt = rd?.size_text || l.description || ''
          const sqftM = txt.match(/([\d,]+)\s*sq\s*ft/i)
          const sqmM = txt.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
          let sqm = sqmM ? parseFloat(sqmM[1].replace(',','')) : sqftM ? Math.round(parseFloat(sqftM[1].replace(',','')) * 0.0929) : 0
          return sqm > 0 && l.price ? l.price / sqm : 0
        } catch { return 0 }
      }
      const pa = getPsqm(a), pb = getPsqm(b)
      if (pa === 0) return 1
      if (pb === 0) return -1
      return pb - pa
    }
    if (sortBy === 'psqm_asc') {
      const getPsqm2 = (l: any) => {
        try {
          const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data) : (l.raw_data || {})
          const txt = rd?.size_text || l.description || ''
          const sqftM = txt.match(/([\d,]+)\s*sq\s*ft/i)
          const sqmM = txt.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
          let sqm = sqmM ? parseFloat(sqmM[1].replace(',','')) : sqftM ? Math.round(parseFloat(sqftM[1].replace(',','')) * 0.0929) : 0
          return sqm > 0 && l.price ? l.price / sqm : 0
        } catch { return 0 }
      }
      const pa2 = getPsqm2(a), pb2 = getPsqm2(b)
      if (pa2 === 0) return 1
      if (pb2 === 0) return -1
      return pa2 - pb2
    }
    // recommended: nearest first if location, otherwise newest
    if (a._dist != null && b._dist != null) return a._dist - b._dist
    return new Date(b.scraped_at || 0).getTime() - new Date(a.scraped_at || 0).getTime()
  })

  const radiusLabel = splitRadius ? `within ${splitRadius} mile${splitRadius === 1 ? '' : 's'}` : ''

  if (!viewReady) return <div style={{minHeight: '500px'}} />

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-stone-500 flex items-center gap-2 flex-wrap">
          {inRadius.length} properties{location ? ' in ' + location : ' in London'}
          {radiusLabel ? ` · ${radiusLabel}` : ''}
          <SaveSearchButton />
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-[#3D3A38] bg-white outline-none focus:border-[#D3755A] cursor-pointer"
          >
            <option value="relevant">Recommended</option>
            <option value="newest">Most recent</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="size_asc">Smallest floor area</option>
            <option value="size_desc">Largest floor area</option>
            <option value="psqm_desc">Highest £/sqm</option>
            <option value="psqm_asc">Lowest £/sqm</option>
            {locationCoords && <option value="nearest">Nearest first</option>}
          </select>
          <ViewToggle view={view} setView={setView} />
        </div>
      </div>

      {view === 'map' ? (
        <SearchMapView
          listings={sortedResults.filter((l: any) => l.latitude && l.longitude)}
          radius={radius ? radius : (locationCoords ? 0.25 : null)}
          locationCoords={locationCoords}
          location={location}
        />
      ) : (
        <>
          {inRadius.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedResults.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-stone-400 text-sm">No properties found matching your criteria.</p>
              <a href="/search" className="text-orange-700 text-sm mt-2 inline-block">Clear filters</a>
            </div>
          )}

          {nearby.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-stone-200" />
                <h2 className="text-sm font-medium text-stone-500 whitespace-nowrap">
                  {nearby.length} other listings · nearest first
                </h2>
                <div className="h-px flex-1 bg-stone-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {nearby.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    distanceLabel={listing._dist < 1609 ? Math.round(listing._dist) + 'm away' : (Math.round(listing._dist / 160.9) / 10).toFixed(1) + ' mi away'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
