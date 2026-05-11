'use client'

import { useEffect, useRef, useState } from 'react'
import { getViewedListings, markAsViewed } from '@/lib/viewed'
import { ICON_BED_SVG, ICON_BATH_SVG, ICON_SIZE_SVG, ICON_OUTSIDE_SVG, propertyTypeIconSvg, normalisePropertyTypeLabel, extractSqftFromListing, hasOutsideSpace } from '@/lib/popupIcons'

interface Listing {
  id: string
  address: string
  price: number
  latitude: number
  longitude: number
  bedrooms: number | null
  bathrooms?: number | null
  property_type: string | null
  images?: string
  raw_data?: any
  description?: string | null
  key_features?: string[] | null
}

interface Coords { lat: number, lng: number }


export default function SearchMapView({ listings, radius, locationCoords, location, listingType = "rent" }: {
  listings: Listing[]
  listingType?: string
  radius?: number | null
  locationCoords?: Coords | null
  location?: string
}) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const markersRef = useRef<Record<string, any>>({})

  const mapped = listings.filter(l => l.latitude && l.longitude)

  function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }



  useEffect(() => {
    if (!mapContainer.current) return
    if (mapRef.current) { try { mapRef.current.remove() } catch {} mapRef.current = null }
    if (mapContainer.current) {
      // Clear Leaflet's internal container ID to allow re-initialisation
      delete (mapContainer.current as any)._leaflet_id
    }

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css')
      const viewed = getViewedListings()
      const effectiveRadius = radius ?? (locationCoords ? 0.25 : null)
      const filteredMapped = (effectiveRadius && locationCoords)
        ? mapped.filter(l => distanceMiles(locationCoords.lat, locationCoords.lng, Number(l.latitude), Number(l.longitude)) <= effectiveRadius)
        : mapped

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

      // Cluster group config: cluster aggressively when zoomed out, never cluster
      // at street-level zoom (≥16). Click on a cluster smoothly zooms into its
      // bounds; spiderfy as a fallback when at max zoom.
      const clusterOpts = {
        maxClusterRadius: 80,
        disableClusteringAtZoom: 16,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        chunkedLoading: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount()
          const size = count < 10 ? 36 : count < 50 ? 44 : 54
          return L.divIcon({
            className: '',
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#D85A30;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:${count < 10 ? 13 : count < 100 ? 14 : 13}px;font-family:Georgia,serif;cursor:pointer;line-height:1;box-sizing:border-box;">${count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          })
        },
      }
      const dotsCluster = (L as any).markerClusterGroup(clusterOpts)
      const bubblesCluster = (L as any).markerClusterGroup(clusterOpts)

      function showDots() {
        try { mapRef.current.removeLayer(bubblesCluster) } catch {}
        dotsCluster.addTo(mapRef.current)
      }
      function showBubbles() {
        try { mapRef.current.removeLayer(dotsCluster) } catch {}
        bubblesCluster.addTo(mapRef.current)
      }

      filteredMapped.forEach((listing: any) => {
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
          html: `<div data-id="${listing.id}" style="background:${bg};border-radius:99px;padding:5px 12px;font-size:12px;font-weight:${weight};color:${textCol};box-shadow:0 2px 10px rgba(0,0,0,0.2);border:2px solid ${borderCol};white-space:nowrap;font-family:Georgia,serif;cursor:pointer;position:relative;text-align:center;">£${listing.price?.toLocaleString()}${listingType === 'rent' ? '/mo' : ''}<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${borderCol};"></div></div>`,
          iconSize: [130, 36],
          iconAnchor: [65, 43],
        })

        const popupContent = `
          <div style="width:210px;font-family:sans-serif;">
            ${imgSrc ? `<img src="${imgSrc}" referrerpolicy="no-referrer" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>` : '<div style="width:100%;height:80px;background:#f5f5f0;border-radius:6px;margin-bottom:8px;"></div>'}
            <div style="font-size:15px;font-weight:600;color:#1a1a18;font-family:Georgia,serif;margin-bottom:2px;">£${listing.price?.toLocaleString()}${listingType === 'rent' ? '<span style="font-size:11px;color:#9e9e99;font-weight:400;font-family:sans-serif;">/mo</span>' : ''}</div>
            <div style="font-size:11px;color:#6b6b67;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${listing.address}</div>
            <div style="font-size:11px;color:#9e9e99;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${listing.bedrooms ? `<span style="display:inline-flex;align-items:center;">${ICON_BED_SVG}${listing.bedrooms} bed</span>` : ''} ${listing.bathrooms ? `<span style="display:inline-flex;align-items:center;">${ICON_BATH_SVG}${listing.bathrooms} bath</span>` : ''} ${listing.property_type ? `<span style="display:inline-flex;align-items:center;">${propertyTypeIconSvg(listing.property_type)}${normalisePropertyTypeLabel(listing.property_type)}</span>` : ''} ${(() => { const s = extractSqftFromListing(listing); return s ? `<span style="display:inline-flex;align-items:center;">${ICON_SIZE_SVG}${s}</span>` : '' })()} ${(() => { const o = hasOutsideSpace(listing); return o ? `<span style="display:inline-flex;align-items:center;">${ICON_OUTSIDE_SVG}${o}</span>` : '' })()}</div>
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
              bubble.style.borderColor = '#c8c7c2'
              bubble.style.color = '#6b6b67'
              const tail2 = bubble.querySelector('div') as HTMLElement
              if (tail2) tail2.style.borderTopColor = '#c8c7c2'
            }
          }
        })
        marker.on('popupclose', () => setActiveId(null))
        bubblesCluster.addLayer(marker)
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
        dotsCluster.addLayer(dotMarker)
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
      // Determine circle centre - use locationCoords if available, otherwise centre of markers
      const circleCentre = locationCoords || (filteredMapped.length > 0 ? (() => {
        const lats = filteredMapped.map((l: any) => Number(l.latitude))
        const lngs = filteredMapped.map((l: any) => Number(l.longitude))
        return { lat: lats.reduce((a: number, b: number) => a + b) / lats.length, lng: lngs.reduce((a: number, b: number) => a + b) / lngs.length }
      })() : null)

      if (effectiveRadius && circleCentre) {
        const radiusMetres = effectiveRadius * 1609.34
        L.circle([circleCentre.lat, circleCentre.lng], {
          radius: radiusMetres,
          color: '#D85A30',
          fillColor: '#D85A30',
          fillOpacity: 0.06,
          weight: 1.5,
          dashArray: '6 4',
        }).addTo(mapRef.current)
        mapRef.current.fitBounds(
          L.latLng(circleCentre.lat, circleCentre.lng).toBounds(radiusMetres * 2),
          { padding: [40, 40], animate: false }
        )
      }

      // Highlight road/street if location looks like a street name
      if (location && locationCoords) {
        const isStreet = /\b(road|street|avenue|lane|close|grove|place|way|drive|crescent|terrace|gardens?|mews|square|row|walk|path|hill|rise|parade|court|broadway)\b/i.test(location)
        if (isStreet) {
          try {
            const encoded = encodeURIComponent(location + ', London, UK')
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=geojson&limit=1&polygon_geojson=1`, {
              headers: { 'User-Agent': 'NestLondon/1.0' }
            })
            const gj = await resp.json()
            if (gj.features?.length > 0) {
              const feature = gj.features[0]
              if (feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString') {
                L.geoJSON(feature, {
                  style: { color: '#D3755A', weight: 5, opacity: 0.8 }
                }).addTo(mapRef.current)
              }
            }
          } catch {}
        }
      }

      // Fit to location or markers
      if (!effectiveRadius && locationCoords) {
        // Have a location but no radius - zoom to it at street level
        mapRef.current.setView([locationCoords.lat, locationCoords.lng], 15, { animate: false })
      } else if (!effectiveRadius && filteredMapped.length > 0) {
        const bounds = L.latLngBounds(filteredMapped.map((l: any) => [parseFloat(String(l.latitude)), parseFloat(String(l.longitude))] as [number, number]))
        mapRef.current.fitBounds(bounds, { padding: [40, 40], animate: false })
      }
    }

    initMap()
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [radius, locationCoords, location, listingType, listings.length])

  const RADIUS_OPTIONS = [
    { label: 'This area only', value: null },
    { label: '0.5 mi', value: 0.5 },
    { label: '1 mi', value: 1 },
    { label: '2 mi', value: 2 },
    { label: '5 mi', value: 5 },
    { label: '10 mi', value: 10 },
  ]

  function changeRadius(r: number | null) {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (r === null) sp.set('radius', '0.25')  // 'This area only' = 0.25mi
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
