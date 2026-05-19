'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getViewedListings, markAsViewed } from '@/lib/viewed'
import PillStat from './PillStat'
import { extractSqftFromListing } from '@/lib/popupIcons'
import { detectOutsideSpace } from '@/lib/outsideSpace'
import { parseListingImages } from '@/lib/listingImages'

interface Props {
  listing: any
  showHidden?: boolean
  onHide?: () => void
  distanceLabel?: string
}

function extractFeatureTags(listing: any): {label: string, positive: boolean}[] {
  const tags: {label: string, positive: boolean}[] = []
  // Strip Rightmove's structured trailing sections (COUNCIL TAX / PARKING / GARDEN / ACCESSIBILITY) — they create false positives
  const rawDesc = (listing.description || '').toLowerCase()
  const desc = rawDesc.replace(/\n\s*brochures[\s\S]*$/i, '').replace(/\n\s*read full description[\s\S]*$/i, '')

  // Pull key_features and photo_tags from raw_data for more reliable signal
  const rd = typeof listing.raw_data === 'string' ? (() => { try { return JSON.parse(listing.raw_data) } catch { return {} } })() : (listing.raw_data || {})
  const keyFeatures = (rd?.key_features || []).join(' ').toLowerCase()
  const photoFeatures = (rd?.photo_tags?.features || []).join(' ').toLowerCase()
  const combined = [desc, keyFeatures, photoFeatures].join(' ')

  // Parking — only count it if it's a property feature (in key_features or photo_tags), not just a structured 'PARKING: On street' section.
  if (/\b(?:private|allocated|secure|own|underground|gated|off.street)\s+parking\b/.test(combined) || /\bgarage\b/.test(combined) || /\bparking\b/.test(keyFeatures)) tags.push({label: 'Parking', positive: true})
  if (/\bconcierge\b/.test(keyFeatures) || /\bconcierge\b/.test(photoFeatures)) tags.push({label: 'Concierge', positive: true})
  if (/\b(?:lift|elevator)\b/.test(keyFeatures)) tags.push({label: 'Lift', positive: true})
  if (combined.includes('bills included') || combined.includes('bills inc')) tags.push({label: 'Bills incl.', positive: true})
  if (combined.includes('pet')) tags.push({label: 'Pets OK', positive: true})
  if (combined.includes('top floor') || combined.includes('penthouse')) tags.push({label: 'Top floor', positive: true})
  if (combined.includes('period') || combined.includes('victorian') || combined.includes('georgian')) tags.push({label: 'Period', positive: true})
  if (combined.includes('newly') || combined.includes('refurb') || combined.includes('modern kitchen')) tags.push({label: 'Refurbed', positive: true})
  const furnishedVal = (listing.furnished || '').toLowerCase()
  if (furnishedVal.includes('furnished') && !furnishedVal.includes('unfurnished')) tags.push({label: 'Furnished', positive: true})
  else if (furnishedVal.includes('unfurnished') && !furnishedVal.includes('furnished')) tags.push({label: 'Unfurnished', positive: false})
  else if (furnishedVal.includes('part furnished') || (furnishedVal.includes('furnished') && furnishedVal.includes('unfurnished'))) tags.push({label: 'Part furnished', positive: true})
  return tags
}

// Compute the corner pill label for this listing. "Just added" wins if the
// listing is fresh (within 3d for rent, 7d for buy). Otherwise "New build" if
// the listing is flagged as such. Otherwise null (no pill).
function cornerPillLabel(listing: any): string | null {
  const created = listing.created_at || listing.first_seen
  if (created) {
    const ageDays = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24)
    const isRent = listing.listing_type !== 'buy'
    const threshold = isRent ? 3 : 7
    if (ageDays <= threshold) return 'Just added'
  }
  if (listing.new_build) return 'New build'
  return null
}

export default function ListingCard({ listing, distanceLabel, showHidden = false, onHide,
}: Props) {
  const [viewed, setViewed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingHeart, setSavingHeart] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const searchParams = useSearchParams()
  const fromParam = searchParams.toString() ? '?from=' + encodeURIComponent('?' + searchParams.toString()) : ''

  useEffect(() => {
    setViewed(getViewedListings().has(listing.id))
    try {
      const hiddenIds = JSON.parse(localStorage.getItem('nestlondon_hidden') || '[]')
      if (hiddenIds.includes(listing.id)) setHidden(true)
    } catch {}
    fetch('/api/saved/property')
      .then(r => r.json())
      .then(d => {
        const ids = Array.isArray(d.saved) ? d.saved : []
        if (ids.includes(listing.id)) setSaved(true)
      })
      .catch(() => {})
    fetch('/api/hidden')
      .then(r => r.json())
      .then(d => {
        const ids: string[] = d.ids || []
        if (ids.includes(listing.id)) {
          setHidden(true)
          try {
            const local = JSON.parse(localStorage.getItem('nestlondon_hidden') || '[]')
            if (!local.includes(listing.id)) {
              localStorage.setItem('nestlondon_hidden', JSON.stringify([...local, listing.id]))
            }
          } catch {}
        }
      })
      .catch(() => {})
  }, [listing.id])

  const images = parseListingImages(listing.images)
  const mainImg = images[imgIndex] || null
  // Two small thumbnails next to the main image. Pick the next two in the
  // carousel sequence so clicking through cycles through visible thumbnails.
  const thumb1 = images.length > 1 ? images[(imgIndex + 1) % images.length] : null
  const thumb2 = images.length > 2 ? images[(imgIndex + 2) % images.length] : null

  // Merge extractFeatureTags (regex-matched from description + raw_data) with
  // raw photo_tags.features (curated by the scraper from listing photos). The
  // two sources overlap (e.g. both might surface "Top floor"), so dedupe on
  // lowercase label. photo_tags.features come pre-cleaned so we trust them as
  // positive without re-checking.
  const baseTags = extractFeatureTags(listing)
  const rawData: any = typeof listing.raw_data === 'string'
    ? (() => { try { return JSON.parse(listing.raw_data) } catch { return {} } })()
    : (listing.raw_data || {})
  const photoFeatures: string[] = Array.isArray(rawData?.photo_tags?.features) ? rawData.photo_tags.features : []
  const seen = new Set(baseTags.map(t => t.label.toLowerCase()))
  // Skip outside-space terms (Balcony, Terrace, Garden) — those are shown in
  // the stat row via detectOutsideSpace, not the tag row.
  const OUTSIDE_TERMS = new Set(['balcony', 'balcony visible', 'terrace', 'garden', 'private garden', 'rear garden'])
  const photoTags = photoFeatures
    .filter(f => typeof f === 'string' && f.trim().length > 0)
    .filter(f => !OUTSIDE_TERMS.has(f.toLowerCase()))
    .filter(f => !seen.has(f.toLowerCase()) && (seen.add(f.toLowerCase()), true))
    .map(label => ({label, positive: true}))
  const tags = [...baseTags, ...photoTags]
  const outside = detectOutsideSpace(listing)
  const cornerPill = cornerPillLabel(listing)
  // Description blurb — truncated to ~100 chars. Sits below the feature pills.
  const desc = listing.description ? listing.description.slice(0, 100) + (listing.description.length > 100 ? '…' : '') : null

  if (hidden && !showHidden) return null

  // Hidden + showHidden — simplified, single-photo layout for the hidden state.
  // Not worth replicating the full 3-photo design for a rarely-shown state.
  if (hidden && showHidden) return (
    <div className="grayscale opacity-60">
      <Link href={'/listings/' + listing.id + fromParam}
        className="group block border rounded-lg overflow-hidden transition-all no-underline bg-white border-[#E8E2DA]"
        onClick={e => e.preventDefault()}>
        <div className="relative h-48 overflow-hidden">
          {mainImg ? (
            <img src={mainImg} alt={listing.address} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-stone-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1"/></svg>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="text-sm font-medium mb-0.5 truncate text-[#1C2B3A]">{listing.address}</div>
          <div className="text-lg font-semibold text-[#1C2B3A] mb-2">£{listing.price?.toLocaleString()}{listing.listing_type !== 'buy' && <span className="text-sm font-normal text-stone-400">/mo</span>}</div>
          <div className="flex items-center gap-2">
            <button onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              setHidden(false)
              try {
                const ids = JSON.parse(localStorage.getItem('nestlondon_hidden') || '[]')
                localStorage.setItem('nestlondon_hidden', JSON.stringify(ids.filter((id: string) => id !== listing.id)))
              } catch {}
              fetch('/api/hidden', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: listing.id }) }).catch(() => {})
              setTimeout(() => { if (onHide) onHide() }, 50)
            }} className="flex-1 text-xs rounded-lg py-2 text-center bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors">
              Unhide
            </button>
          </div>
        </div>
      </Link>
    </div>
  )

  return (
    <Link
      href={'/listings/' + listing.id + fromParam}
      onClick={() => markAsViewed(listing.id)}
      className={'group flex flex-col border rounded-lg overflow-hidden transition-all no-underline bg-white border-[#E8E2DA] hover:shadow-md hover:border-stone-300'}
    >
      {/* Three-photo cover: 1 big on the left (2/3 width) + 2 small stacked
          on the right (1/3 width). Falls back gracefully when fewer images
          are available — the small thumb slots stay empty rather than
          replicating the main photo. */}
      <div className="relative h-56 overflow-hidden grid grid-cols-3 gap-1 bg-stone-100">
        {/* Main photo — spans 2 columns */}
        <div className="col-span-2 relative overflow-hidden">
          {mainImg ? (
            <img
              src={mainImg}
              alt={listing.address}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={e => {
                // Skip to the next image if this one fails. Once we've
                // cycled through all images, drop further attempts by
                // detaching the error handler so we don't loop forever.
                if (images.length > 1) {
                  (e.currentTarget as HTMLImageElement).onerror = null
                  setImgIndex(i => (i + 1) % images.length)
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1"/></svg>
            </div>
          )}

          {/* Corner pill: "Just added" / "New build" — sits top-left. */}
          {cornerPill && (
            <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-md font-medium bg-[#D3755A] text-white">
              {cornerPill}
            </div>
          )}

          {distanceLabel && (
            <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-md font-medium bg-white/95 text-[#374151]">
              {distanceLabel}
            </div>
          )}
          {viewed && (
            <div className="absolute top-2 right-2 bg-stone-200/90 text-stone-500 text-xs px-2 py-0.5 rounded-full">Viewed</div>
          )}

          {images.length > 1 && (
            <>
              {/* Invisible hit zones on left/right 25% of main image */}
              <div onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i - 1 + images.length) % images.length) }}
                className="absolute left-0 top-0 w-1/4 h-full z-10 cursor-pointer" />
              <div onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i + 1) % images.length) }}
                className="absolute right-0 top-0 w-1/4 h-full z-10 cursor-pointer" />
              {/* Arrow buttons — visible on hover */}
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i - 1 + images.length) % images.length) }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center transition-all z-20 opacity-0 group-hover:opacity-100"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3L4 7l5 4"/></svg>
              </button>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIndex(i => (i + 1) % images.length) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center transition-all z-20 opacity-0 group-hover:opacity-100"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 3l5 4-5 4"/></svg>
              </button>
            </>
          )}
        </div>

        {/* Two small thumbnails on the right, stacked vertically. Each fills
            half the right column. Empty slots stay as the stone-100 background
            so missing photos don't look broken. */}
        <div className="col-span-1 grid grid-rows-2 gap-1">
          <div className="overflow-hidden">
            {thumb1 && <img src={thumb1} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
          </div>
          <div className="overflow-hidden">
            {thumb2 && <img src={thumb2} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Address */}
        <div className={'text-sm font-medium mb-1 truncate text-[#1C2B3A]'}>{listing.address}</div>

        {/* Price — moved here from the photo overlay. Larger weight so it's the focal point of the details panel. */}
        <div className="text-lg font-semibold text-[#1C2B3A] mb-2">
          £{listing.price?.toLocaleString()}
          {listing.listing_type !== 'buy' && <span className="text-sm font-normal text-stone-400">/mo</span>}
        </div>

        {/* Stat row: bed/bath/type/sqm + outside-space pill inline */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? <PillStat icon="bed" label="Studio" /> : listing.bedrooms ? <PillStat icon="bed" label={`${listing.bedrooms} bed`} /> : null}
          {listing.bathrooms ? <PillStat icon="bath" label={`${listing.bathrooms} bath`} /> : null}
          {listing.property_type && <PillStat icon="home" label={listing.property_type} />}
          {(() => { const s = extractSqftFromListing(listing); return s ? <PillStat icon="size" label={s} /> : null })()}
          {/* Outside-space pill — shown alongside the stat row when confirmed.
              Uses the shared detectOutsideSpace lib so bare "garden" in a
              description (e.g. "Hatton Garden") doesn't falsely trigger. */}
          {outside.kind === 'confirmed' && outside.types && outside.types.length > 0 && (
            <PillStat icon="outside" label={outside.types[0]} />
          )}
          {listing.furnished && <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full inline-flex items-center gap-1">{(listing.furnished as string).split(',')[0].trim().charAt(0).toUpperCase() + (listing.furnished as string).split(',')[0].trim().slice(1)}</span>}
        </div>

        {/* Feature tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => (
              <span key={tag.label} className={'text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ' + (tag.positive ? 'bg-orange-50 text-orange-700' : 'bg-stone-100 text-stone-500')}>
                {tag.positive && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Description blurb — short truncated tease under the feature pills. */}
        {desc && <p className="text-xs text-stone-500 leading-relaxed mb-3">{desc}</p>}

        {/* Action row: view/save/hide */}
        {hidden ? null : (
        <div className="flex items-center gap-2 mt-auto">
          <div className={'flex-1 text-xs rounded-lg py-2 text-center ' + (viewed ? 'bg-stone-100 text-stone-400' : 'text-white')} style={viewed ? {} : {background:'#D3755A'}}>
            {viewed ? 'View again' : 'View property'}
          </div>
          <button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (savingHeart) return
              setSavingHeart(true)
              if (saved) {
                setSaved(false)
              } else {
                const res = await fetch('/api/saved/property', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ listing_id: listing.id })
                })
                if (res.status === 401) {
                  const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
                  window.location.href = '/auth/signup?role=resident&save=' + encodeURIComponent(listing.id) + '&next=' + encodeURIComponent(next)
                  return
                }
                if (res.ok) {
                  setSaved(true)
                  fetch('/api/listings/event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ listing_id: listing.id, event_type: 'save' })
                  }).catch(() => {})
                }
              }
              setSavingHeart(false)
            }}
            className="w-9 h-9 rounded-lg border border-[#E8E2DA] flex items-center justify-center hover:border-[#D3755A] transition-colors flex-shrink-0"
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            <svg className="w-4 h-4" fill={saved ? '#D3755A' : 'none'} stroke={saved ? '#D3755A' : '#9B928E'} viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setHidden(true)
              try {
                const hiddenIds = JSON.parse(localStorage.getItem('nestlondon_hidden') || '[]')
                localStorage.setItem('nestlondon_hidden', JSON.stringify([...hiddenIds, listing.id]))
              } catch {}
              fetch('/api/hidden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: listing.id }) }).catch(() => {})
              if (onHide) onHide()
            }}
            className="w-9 h-9 rounded-lg border border-[#E8E2DA] flex items-center justify-center hover:border-red-300 hover:text-red-400 transition-colors flex-shrink-0 text-[#9B928E]"
            aria-label="Hide listing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        )}
      </div>
    </Link>
  )
}
