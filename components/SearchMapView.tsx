'use client'

import { useEffect, useRef, useState } from 'react'
import { getViewedListings, markAsViewed } from '@/lib/viewed'

interface Listing {
  id: string
  address: string
  price: number
  latitude: number
  longitude: number
  bedrooms: number | null
  property_type: string | null
  images?: string
}

interface Coords { lat: number, lng: number }

export default function SearchMapView({ listings, radius, locationCoords }: {
  listings: Listing[]
  radius?: number | null
  locationCoords?: Coords | null
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const markersRef = useRef<Record<string, any>>({})

  const mapped = listings.filter(l => l.latitude && l.longitude)

  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) { try { mapRef.current.remove() } catch {} mapRef.current = null }

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      const viewed = getViewedListings()

      // Centre on London
      mapRef.current = L.map(mapContainer.current!, {
        center: [51.505, -0.118],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current)

      const markerDots: Record<string, any> = {}
      const markerBubbles: Record<string, any> = {}

      function showDots() {
        Object.values(markerBubbles).forEach(m => { try { mapRef.current.removeLayer(m) } catch {} })
        Object.values(markerDots).forEach(m => m.addTo(mapRef.current))
      }
      function showBubbles() {
        Object.values(markerDots).forEach(m => { try { mapRef.current.removeLayer(m) } catch {} })
        Object.values(markerBubbles).forEach(m => m.addTo(mapRef.current))
      }

      mapped.forEach(listing => {
        const lat = parseFloat(String(listing.latitude))
        const lng = parseFloat(String(listing.longitude))
        if (!lat || !lng) return

        const hasViewed = viewed.has(listing.id)
        const bg = hasViewed ? '#c8c7c2' : 'white'
        const color = hasViewed ? '#4a4a45' : '#1a1a18'
        const weight = hasViewed ? '600' : '500'
        const tail = hasViewed ? '#c8c7c2' : 'white'

        let imgSrc = ''
        try {
          const imgs = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || [])
          imgSrc = Array.isArray(imgs) ? (imgs.find((u: string) => u && u.startsWith('http')) || '') : ''
        } catch {}

        const borderCol = hasViewed ? '#c8c7c2' : '#D85A30'
        const textCol = hasViewed ? '#6b6b67' : '#D85A30'
        const icon = L.divIcon({
          className: '',
          html: `<div data-id="${listing.id}" style="background:${bg};border-radius:99px;padding:5px 12px;font-size:12px;font-weight:${weight};color:${textCol};box-shadow:0 2px 10px rgba(0,0,0,0.2);border:2px solid ${borderCol};white-space:nowrap;font-family:Georgia,serif;cursor:pointer;position:relative;text-align:center;">£${listing.price?.toLocaleString()}/mo<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${borderCol};"></div></div>`,
          iconSize: [130, 36],
          iconAnchor: [65, 43],
        })

        const popupContent = `
          <div style="width:210px;font-family:sans-serif;">
            ${imgSrc ? `<img src="${imgSrc}" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>` : '<div style="width:100%;height:80px;background:#f5f5f0;border-radius:6px;margin-bottom:8px;"></div>'}
            <div style="font-size:15px;font-weight:600;color:#1a1a18;font-family:Georgia,serif;margin-bottom:2px;">£${listing.price?.toLocaleString()}<span style="font-size:11px;color:#9e9e99;font-weight:400;font-family:sans-serif;">/mo</span></div>
            <div style="font-size:11px;color:#6b6b67;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${listing.address}</div>
            <div style="font-size:11px;color:#9e9e99;margin-bottom:10px;">${listing.bedrooms ? listing.bedrooms + ' bed' : ''} ${listing.property_type || ''}</div>
            <a href="/listings/${listing.id}" target="_blank" onclick="window.__markViewed && window.__markViewed('${listing.id}')" style="display:block;background:#D85A30;color:white;text-align:center;padding:7px;border-radius:7px;font-size:12px;text-decoration:none;">View listing →</a>
          </div>
        `

        const marker = L.marker([lat, lng], { icon, zIndexOffset: hasViewed ? 0 : 100 })
        marker.bindPopup(popupContent, { maxWidth: 220, closeButton: true, offset: [0, -12] })
        marker.on('popupopen', () => {
          markAsViewed(listing.id)
          setActiveId(listing.id)
          const el = marker.getElement()
          if (el) {
            const bubble = el.querySelector('div') as HTMLElement
            if (bubble) {
              bubble.style.background = '#c8c7c2'
              bubble.style.fontWeight = '600'
              const tail2 = bubble.querySelector('div') as HTMLElement
              if (tail2) tail2.style.borderTopColor = '#c8c7c2'
            }
          }
        })
        marker.on('popupclose', () => setActiveId(null))
        marker.addTo(mapRef.current)
        markersRef.current[listing.id] = marker
        markerBubbles[listing.id] = marker

        // Dot icon for zoomed-out view
        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:${hasViewed ? '#c8c7c2' : '#D85A30'};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        const dotMarker = L.marker([lat, lng], { icon: dotIcon, zIndexOffset: hasViewed ? 0 : 100 })
        dotMarker.bindPopup(marker.getPopup()!)
        dotMarker.on('popupopen', () => {
          markAsViewed(listing.id)
          setActiveId(listing.id)
          const el = dotMarker.getElement()
          if (el) {
            const dot = el.querySelector('div') as HTMLElement
            if (dot) dot.style.background = '#c8c7c2'
          }
        })
        dotMarker.on('popupclose', () => setActiveId(null))
        markerDots[listing.id] = dotMarker
      })

      // Zoom handler - switch between dots and bubbles
      const BUBBLE_ZOOM = 14
      mapRef.current.on('zoomend', () => {
        if (mapRef.current.getZoom() >= BUBBLE_ZOOM) showBubbles()
        else showDots()
      })

      // Initial state based on zoom
      if (mapRef.current.getZoom() >= BUBBLE_ZOOM) showBubbles()
      else showDots()

      ;(window as any).__markViewed = (id: string) => markAsViewed(id)

      // Draw radius circle and zoom to it
      if (radius && locationCoords) {
        const radiusMetres = radius * 1609.34
        L.circle([locationCoords.lat, locationCoords.lng], {
          radius: radiusMetres,
          color: '#D85A30',
          fillColor: '#D85A30',
          fillOpacity: 0.06,
          weight: 1.5,
          dashArray: '6 4',
        }).addTo(mapRef.current)
        mapRef.current.fitBounds(
          L.latLng(locationCoords.lat, locationCoords.lng).toBounds(radiusMetres * 2),
          { padding: [40, 40], animate: false }
        )
      }

      // Fit to location or markers
      if (!radius && locationCoords) {
        // Have a location but no radius - zoom to it at street level
        mapRef.current.setView([locationCoords.lat, locationCoords.lng], 15, { animate: false })
      } else if (!radius && mapped.length > 0) {
        const bounds = L.latLngBounds(mapped.map((l: any) => [parseFloat(String(l.latitude)), parseFloat(String(l.longitude))] as [number, number]))
        mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: false })
      }
    }

    initMap()
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [radius, locationCoords])

  const RADIUS_OPTIONS = [
    { label: 'Any', value: null },
    { label: '0.5 mi', value: 0.5 },
    { label: '1 mi', value: 1 },
    { label: '2 mi', value: 2 },
    { label: '5 mi', value: 5 },
    { label: '10 mi', value: 10 },
  ]

  function changeRadius(r: number | null) {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (r === null) sp.delete('radius')
    else sp.set('radius', String(r))
    sp.set('view', 'map') // preserve map view
    window.location.href = '/search?' + sp.toString()
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E8E2DA]" style={{height: 'calc(100vh - 220px)', minHeight: '500px'}}>
      <div ref={mapContainer} style={{height: '100%', zIndex: 0}} />

      {/* Radius selector overlay */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-md border border-[#E8E2DA]">
        <span className="text-xs text-stone-400 mr-1 pl-1">Radius</span>
        {RADIUS_OPTIONS.map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => changeRadius(opt.value)}
            className={'text-xs px-2.5 py-1 rounded-full transition-colors ' + (radius === opt.value ? 'bg-[#D85A30] text-white font-medium' : 'text-[#4A5568] hover:bg-stone-100')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-stone-500 shadow-sm">
        {mapped.length} listings on map
        {listings.length - mapped.length > 0 && ` · ${listings.length - mapped.length} without location`}
      </div>
    </div>
  )
}
