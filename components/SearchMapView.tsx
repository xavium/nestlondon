'use client'

import { useEffect, useRef, useState } from 'react'
import { getViewedListings, markAsViewed } from '@/lib/viewed'
import { ICON_BED_SVG, ICON_BATH_SVG, ICON_SIZE_SVG, ICON_OUTSIDE_SVG, propertyTypeIconSvg, normalisePropertyTypeLabel, extractSqftFromListing, hasOutsideSpace, buildCarouselHtml, attachCarousel } from '@/lib/popupIcons'

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


export default function SearchMapView({ listings, radius, locationCoords, location, boroughMatch, listingType = "rent" }: {
  listings: Listing[]
  listingType?: string
  radius?: number | null
  locationCoords?: Coords | null
  location?: string
  boroughMatch?: string | null
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
    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css')
      const viewed = getViewedListings()
      const effectiveRadius = boroughMatch ? null : (radius ?? (locationCoords ? 0.25 : null))
      const filteredMapped = (effectiveRadius && locationCoords)
        ? mapped.filter(l => distanceMiles(locationCoords.lat, locationCoords.lng, Number(l.latitude), Number(l.longitude)) <= effectiveRadius)
        : mapped

      if (cancelled || !mapContainer.current) return
      // If a previous run left the container initialised, tear it down before re-init
      if ((mapContainer.current as any)._leaflet_id) {
        delete (mapContainer.current as any)._leaflet_id
      }
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
        disableClusteringAtZoom: 19,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
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

        let images: string[] = []
        try {
          const imgs = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || [])
          images = Array.isArray(imgs) ? imgs.filter((u: string) => u && u.startsWith('http')) : []
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
          <div style="width:290px;font-family:sans-serif;">
            ${buildCarouselHtml(images, listing.id, 190)}
            <div style="font-size:15px;font-weight:600;color:#1a1a18;font-family:Georgia,serif;margin-bottom:2px;">£${listing.price?.toLocaleString()}${listingType === 'rent' ? '<span style="font-size:11px;color:#9e9e99;font-weight:400;font-family:sans-serif;">/mo</span>' : ''}</div>
            <div style="font-size:11px;color:#6b6b67;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${listing.address}</div>
            <div style="font-size:11px;color:#9e9e99;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${listing.bedrooms ? `<span style="display:inline-flex;align-items:center;">${ICON_BED_SVG}${listing.bedrooms} bed</span>` : ''} ${listing.bathrooms ? `<span style="display:inline-flex;align-items:center;">${ICON_BATH_SVG}${listing.bathrooms} bath</span>` : ''} ${listing.property_type ? `<span style="display:inline-flex;align-items:center;">${propertyTypeIconSvg(listing.property_type)}${normalisePropertyTypeLabel(listing.property_type)}</span>` : ''} ${(() => { const s = extractSqftFromListing(listing); return s ? `<span style="display:inline-flex;align-items:center;">${ICON_SIZE_SVG}${s}</span>` : '' })()} ${(() => { const o = hasOutsideSpace(listing); return o ? `<span style="display:inline-flex;align-items:center;">${ICON_OUTSIDE_SVG}${o}</span>` : '' })()}</div>
            <a href="/listings/${listing.id}" target="_blank" onclick="window.__markViewed && window.__markViewed('${listing.id}')" style="display:block;background:#D85A30;color:white;text-align:center;padding:7px;border-radius:7px;font-size:12px;text-decoration:none;">View listing →</a>
          </div>
        `

        // Build both icons upfront so we can swap between them on popup open/close
        const dotIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:${hasViewed ? '#c8c7c2' : '#D85A30'};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        // Always-grey variant — used when a popup is open, to show 'viewed'
        const greyDotIcon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#c8c7c2;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        const marker = L.marker([lat, lng], { icon, zIndexOffset: hasViewed ? 0 : 100 })
        marker.bindPopup(popupContent, { maxWidth: 300, closeButton: true, offset: [0, -12] })
        marker.on('popupopen', () => {
          markAsViewed(listing.id)
          setActiveId(listing.id)
          attachCarousel(marker.getPopup()?.getElement() || null, images)
          // Shrink the bubble to a grey dot while popup is open
          marker.setIcon(greyDotIcon)
        })
        marker.on('popupclose', () => {
          setActiveId(null)
          // After viewing, restore the bubble but in 'viewed' (grey) style
          const viewedBubble = L.divIcon({
            className: '',
            html: `<div data-id="${listing.id}" style="background:#c8c7c2;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:#6b6b67;box-shadow:0 2px 10px rgba(0,0,0,0.2);border:2px solid #c8c7c2;white-space:nowrap;font-family:Georgia,serif;cursor:pointer;position:relative;text-align:center;">£${listing.price?.toLocaleString()}${listingType === 'rent' ? '/mo' : ''}<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #c8c7c2;"></div></div>`,
            iconSize: [130, 36],
            iconAnchor: [65, 43],
          })
          marker.setIcon(viewedBubble)
        })
        ;(marker as any)._listingId = listing.id
        ;(marker as any)._listingPrice = listing.price
        ;(marker as any)._listingAddress = listing.address
        ;(marker as any)._listingBeds = listing.bedrooms
        ;(marker as any)._listingPtype = listing.property_type
        bubblesCluster.addLayer(marker)
        markersRef.current[listing.id] = marker
        markerBubbles[listing.id] = marker

        const dotMarker = L.marker([lat, lng], { icon: dotIcon, zIndexOffset: hasViewed ? 0 : 100 })
        dotMarker.bindPopup(marker.getPopup()!)
        dotMarker.on('popupopen', () => {
          markAsViewed(listing.id)
          setActiveId(listing.id)
          attachCarousel(dotMarker.getPopup()?.getElement() || null, images)
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

      // Custom cluster click: zoom in to fit bounds. If markers are co-located so
      // bounds would be a single point, open a popup listing all child listings instead.
      function openClusterListPopup(latlng: any, markers: any[]) {
        const items = markers.map((m: any) => {
          const id = m._listingId
          const price = m._listingPrice
          const address = m._listingAddress
          const beds = m._listingBeds
          const ptype = m._listingPtype
          return `<a href="/listings/${id}" target="_blank" onclick="window.__markViewed && window.__markViewed('${id}')" style="display:block;padding:8px 10px;border-radius:6px;background:#fafaf8;margin-bottom:6px;text-decoration:none;color:#1a1a18;">
            <div style="font-size:13px;font-weight:600;font-family:Georgia,serif;">£${price?.toLocaleString()}${listingType === 'rent' ? '<span style="font-size:11px;color:#9e9e99;font-weight:400;font-family:sans-serif;">/mo</span>' : ''}</div>
            <div style="font-size:11px;color:#6b6b67;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${address}</div>
            <div style="font-size:11px;color:#9e9e99;margin-top:2px;">${beds || '?'} bed · ${ptype || ''}</div>
          </a>`
        }).join('')
        const html = `<div style="width:260px;font-family:sans-serif;max-height:340px;overflow-y:auto;">
          <div style="font-size:11px;color:#9e9e99;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${markers.length} listings at this location</div>
          ${items}
        </div>`
        L.popup({ maxWidth: 280, closeButton: true })
          .setLatLng(latlng)
          .setContent(html)
          .openOn(mapRef.current)
      }
      // If searching by borough, render the borough polygon
      if (boroughMatch) {
        try {
          const res = await fetch('/boundaries/boroughs.json')
          const data = await res.json()
          const feature = (data.features || []).find((f: any) => f.properties?.LAD23NM === boroughMatch)
          if (feature) {
            const layer = L.geoJSON(feature, {
              style: {
                color: '#D85A30',
                weight: 2,
                opacity: 0.7,
                fillColor: '#D85A30',
                fillOpacity: 0.08,
              },
              interactive: false,
            })
            layer.addTo(mapRef.current)
            mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] })
          }
        } catch (e) { console.error('failed to load borough polygon', e) }
      }

      const handleClusterClick = (e: any) => {
        const childMarkers = e.layer.getAllChildMarkers()
        const bounds = e.layer.getBounds()
        const nw = mapRef.current.latLngToContainerPoint(bounds.getNorthWest())
        const se = mapRef.current.latLngToContainerPoint(bounds.getSouthEast())
        const pxSpan = Math.max(Math.abs(se.x - nw.x), Math.abs(se.y - nw.y))
        const maxZoom = mapRef.current.getMaxZoom()
        // If markers are within ~30px AND we're at/near max zoom, list popup
        if (pxSpan < 30 && mapRef.current.getZoom() >= maxZoom - 1) {
          openClusterListPopup(e.latlng, childMarkers)
        } else {
          mapRef.current.flyToBounds(bounds, { padding: [40, 40] })
        }
      }
      bubblesCluster.on('clusterclick', handleClusterClick)
      dotsCluster.on('clusterclick', handleClusterClick)

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

      if (effectiveRadius && circleCentre && !boroughMatch) {
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
      cancelled = true
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
