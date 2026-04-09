'use client'

import { useState, useEffect } from 'react'
import SearchMapView from '@/components/SearchMapView'
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
        className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' + (view === 'grid' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-500')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        List
      </button>
      <button onClick={() => switchView('map')}
        className={'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ' + (view === 'map' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-500')}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 20l-5-2V4l5 2m0 14l6-2m-6 2V6m6 12l5 2V6l-5-2m0 14V4"/></svg>
        Map
      </button>
    </div>
  )
}

export function SearchResults({ filtered, allListings, allListingsForMap, radius, locationCoords, location }: {
  filtered: any[]
  allListings: any[]
  allListingsForMap: any[]
  radius?: number | null
  locationCoords?: Coords | null
  location?: string
}) {
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [viewReady, setViewReady] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('view') === 'map') setView('map')
    setViewReady(true)
  }, [])

  // Split: inRadius = within selected radius (or 0.5mi default)
  //        nearby   = everything else sorted by distance
  const splitRadius = radius ?? (locationCoords ? 0.5 : null)
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

    // nearby: ALL listings outside radius sorted by distance
    const inRadiusIds = new Set(inRadius.map((l: any) => l.id))
    nearby = allListings
      .filter((l: any) => l.latitude && l.longitude && !inRadiusIds.has(l.id))
      .map(withDist)
      .sort((a: any, b: any) => a._dist - b._dist)
      .slice(0, 12)
  }

  const radiusLabel = splitRadius ? `within ${splitRadius} mile${splitRadius === 1 ? '' : 's'}` : ''

  if (!viewReady) return <div style={{minHeight: '500px'}} />

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-stone-500">
          {inRadius.length} properties{location ? ' in ' + location : ' in London'}
          {radiusLabel ? ` · ${radiusLabel}` : ''}
        </p>
        <ViewToggle view={view} setView={setView} />
      </div>

      {view === 'map' ? (
        <SearchMapView
          listings={radius
            ? inRadius.filter((l: any) => l.latitude && l.longitude)
            : allListings.filter((l: any) => l.latitude && l.longitude)}
          radius={radius ? radius : (locationCoords ? 0.5 : null)}
          locationCoords={locationCoords}
        />
      ) : (
        <>
          {inRadius.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {inRadius.map((listing: any) => (
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
                  <div key={listing.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 bg-white/90 text-stone-500 text-xs px-2 py-0.5 rounded-full">
                      {listing._dist < 1609 ? Math.round(listing._dist) + 'm away' : (Math.round(listing._dist / 160.9) / 10).toFixed(1) + ' mi away'}
                    </div>
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
