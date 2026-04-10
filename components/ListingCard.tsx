'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getViewedListings, markAsViewed } from '@/lib/viewed'

interface Props {
  listing: any
}

function extractFeatureTags(listing: any): {label: string, positive: boolean}[] {
  const tags: {label: string, positive: boolean}[] = []
  const desc = (listing.description || '').toLowerCase()
  const combined = desc
  // Outside space — mutually exclusive, most specific first, no false negatives
  const noGarden = /no garden|without garden|no private garden/.test(combined)
  if (/\bbalcon(y|ies)\b/.test(combined)) tags.push({label: 'Balcony', positive: true})
  else if (/\bterrace\b/.test(combined) && !/\bterraced\b/.test(combined)) tags.push({label: 'Terrace', positive: true})
  else if (/\bgardens?\b/.test(combined) && !noGarden) tags.push({label: 'Garden', positive: true})
  if (combined.includes('parking') || combined.includes('garage')) tags.push({label: 'Parking', positive: true})
  if (combined.includes('bills included') || combined.includes('bills inc')) tags.push({label: 'Bills incl.', positive: true})
  if (combined.includes('pet')) tags.push({label: 'Pets OK', positive: true})
  if (combined.includes('top floor') || combined.includes('penthouse')) tags.push({label: 'Top floor', positive: true})
  if (combined.includes('period') || combined.includes('victorian') || combined.includes('georgian')) tags.push({label: 'Period', positive: true})
  if (combined.includes('newly') || combined.includes('refurb') || combined.includes('modern kitchen')) tags.push({label: 'Refurbed', positive: true})
  if (listing.furnished === 'furnished') tags.push({label: 'Furnished', positive: true})
  if (listing.furnished === 'unfurnished') tags.push({label: 'Unfurnished', positive: false})
  return tags.slice(0, 4)
}

export default function ListingCard({ listing }: Props) {
  const [viewed, setViewed] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const searchParams = useSearchParams()
  const fromParam = searchParams.toString() ? '?from=' + encodeURIComponent('?' + searchParams.toString()) : ''

  useEffect(() => {
    setViewed(getViewedListings().has(listing.id))
  }, [listing.id])

  let images: string[] = []
  try {
    const raw = listing.images
    const arr: string[] = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
    images = arr.filter((u: string) => typeof u === 'string' && u.startsWith('https'))
  } catch {}
  const imgSrc = images[imgIndex] || null

  const tags = extractFeatureTags(listing)
  const desc = listing.description ? listing.description.slice(0, 100) + (listing.description.length > 100 ? '…' : '') : null

  return (
    <Link
      href={'/listings/' + listing.id + fromParam}
      onClick={() => markAsViewed(listing.id)}
      className={'group block border rounded-2xl overflow-hidden transition-all no-underline ' + (viewed ? 'bg-[#F1EFE8] border-stone-200 opacity-80' : 'bg-white border-stone-200 hover:shadow-md hover:border-stone-300')}
    >
      <div className="relative h-48 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={listing.address} className={'w-full h-full object-cover transition-opacity duration-200 ' + (viewed ? 'grayscale-[30%]' : '')} referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1"/></svg>
          </div>
        )}
        <div className={'absolute top-2 left-2 text-xs px-2 py-1 rounded-lg font-medium ' + (viewed ? 'bg-stone-200/95 text-stone-500' : 'bg-white/95 text-stone-700')}>
          £{listing.price?.toLocaleString()}<span className="text-stone-400 font-normal">/mo</span>
        </div>
        {viewed && (
          <div className="absolute top-2 right-2 bg-stone-200/90 text-stone-500 text-xs px-2 py-0.5 rounded-full">Viewed</div>
        )}
        {!viewed && (
          <div className="absolute bottom-2 right-2 bg-white/90 text-stone-500 text-xs px-2 py-0.5 rounded">{listing.source}</div>
        )}
        {images.length > 1 && (
          <>
            {/* Invisible hit zones on left/right 25% of image */}
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
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.preventDefault(); e.stopPropagation(); setImgIndex(i) }}
                  className={'w-1 h-1 rounded-full transition-colors ' + (i === imgIndex ? 'bg-white' : 'bg-white/40')} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-4">
        <div className={'text-sm font-medium mb-0.5 truncate ' + (viewed ? 'text-stone-500' : 'text-stone-800')}>{listing.address}</div>
        <div className="flex gap-3 text-xs text-stone-400 mb-2">
          {listing.bedrooms && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms && <span>{listing.bathrooms} bath</span>}
          {listing.property_type && <span>{listing.property_type}</span>}
        </div>
        {desc && <p className="text-xs text-stone-500 leading-relaxed mb-3">{desc}</p>}
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
        <div className={'w-full text-xs rounded-lg py-2 text-center ' + (viewed ? 'bg-stone-100 text-stone-400' : 'bg-orange-700 text-white')}>
          {viewed ? 'View again' : 'View property'}
        </div>
      </div>
    </Link>
  )
}
