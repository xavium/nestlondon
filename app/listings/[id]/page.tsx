import ContactOwnerPanel from '@/components/ContactOwnerPanel'
import { cookies } from 'next/headers'
export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import NavSearchBar from '@/components/NavSearchBar'
import NavAuthButton from '@/components/NavAuthButton'
import Link from 'next/link'
import ImageGallery from '@/components/ImageGallery'
import PropertyMap from '@/components/PropertyMap'
import MarkViewed from '@/components/MarkViewed'
import FloorplanSize from '@/components/FloorplanSize'
import ShareButton from '@/components/ShareButton'
import SaveButton from '@/components/SaveButton'
import PhotoTags from '@/components/PhotoTags'
import ListingEventTracker from '@/components/ListingEventTracker'
import CommuteWidget from '@/components/CommuteWidget'
import BuyListingPanel from '@/components/BuyListingPanel'

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<Record<string,string>> }) {
  const { id } = await params
  const sp = await searchParams
  const fromSearch = sp.from ? decodeURIComponent(sp.from) : null
  const navSp = new URLSearchParams(fromSearch || '')
  const navLocation = navSp.get('location') || ''
  const navType = navSp.get('type') || 'rent'
  const navMinBeds = navSp.get('minBeds') ? parseInt(navSp.get('minBeds')!) : null
  const navMaxBeds = navSp.get('maxBeds') ? parseInt(navSp.get('maxBeds')!) : null
  const navMinPrice = navSp.get('minPrice') ? parseInt(navSp.get('minPrice')!) : null
  const navMaxPrice = navSp.get('maxPrice') ? parseInt(navSp.get('maxPrice')!) : null
  const navFurnished = navSp.get('furnished') || null
  const navPropertyType = navSp.get('propertyType') || null
  const navFeatures = navSp.get('features') ? navSp.get('features')!.split(',') : []
  const navRadius = navSp.get('radius') ? parseInt(navSp.get('radius')!) : null
  const navAddedWithin = navSp.get('addedWithin') ? parseInt(navSp.get('addedWithin')!) : null
  const navAvailableFrom = navSp.get('availableFrom') || null
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // Use service role key for admin preview to bypass RLS
  const isAdminPreviewEarly = sp.preview === 'true'
  const queryClient = isAdminPreviewEarly
    ? (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : supabase

  const { data: listing } = await queryClient
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const commuteAddress = currentUser?.user_metadata?.commute_address || null

  if (!listing) { console.log('404: listing not found', id); notFound() }
  const isAdminPreview = isAdminPreviewEarly
  console.log('Listing found:', id, 'is_active:', listing.is_active, 'isAdminPreview:', isAdminPreview, 'agent_id:', listing.agent_id)
  if (!listing.is_active && !isAdminPreview && !listing.agent_id) { console.log('404: inactive listing, no preview'); notFound() }

  let nearbyListings: any[] = []
  if (listing.latitude && listing.longitude) {
    const { data: nearby } = await supabase
      .from('listings')
      .select('id,address,price,latitude,longitude,bedrooms,property_type,images,listing_type')
      .eq('is_active', true)
      .eq('listing_type', listing.listing_type || 'rent')
      .neq('id', id)
      .not('latitude', 'is', null)
      .limit(500)
    nearbyListings = nearby || []
  }

  const rawData = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
  const keyFeatures: string[] = (() => {
    const structured = rawData?.key_features || []
    if (structured.length > 0) return structured
    // Fallback: extract features from description
    const desc = listing.description || ''
    const BLOCKLIST = ['read full description', 'contact us', 'please contact', 'call us', 'click here', 'find out more', 'book a viewing', 'arrange a viewing', 'virtual viewing', 'for more information', 'to find out', 'terms and conditions', 'subject to', 'energy performance', 'utilities', 'rights and', 'council tax', 'epc rating', 'tenure:', 'deposit:', 'local authority', 'total sq', 'ask agent', 'key features', 'accessibility', 'parking', 'garden', 'concierge', 'outside space', 'additional information', 'property information', 'more details']
    const STOP_WORDS = ['read full description', 'council tax', 'parking', 'garden', 'accessibility', 'energy performance', 'utilities']
    const lines = desc.split('\n')
    const bullets: string[] = []
    // Strategy 1: find 'Key Features:' header and extract lines after it
    const kfIdx = lines.findIndex((l: string) => /^key features/i.test(l.trim()))
    if (kfIdx !== -1) {
      for (let i = kfIdx + 1; i < lines.length; i++) {
        const trimmed = lines[i].replace(/^[\u2022\u2023\u25E6\u2043\-\*\•]+\s*/, '').trim()
        const lower = trimmed.toLowerCase()
        if (STOP_WORDS.some((s: string) => lower.startsWith(s))) break
        if (trimmed.length < 3) continue
        if (BLOCKLIST.some((b: string) => lower.startsWith(b) || lower === b)) continue
        if (trimmed.includes('\u2013') || trimmed.includes('\u2014') || trimmed.length > 80) continue
        bullets.push(trimmed)
        if (bullets.length >= 12) break
      }
    }
    // Strategy 2: fall back to bullet-prefixed lines
    if (bullets.length === 0) {
      lines.forEach((line: string) => {
        if (!/^[\u2022\u2023\u25E6\u2043\•]/.test(line.trim())) return
        const trimmed = line.replace(/^[\u2022\u2023\u25E6\u2043\•]+\s*/, '').trim()
        const lower = trimmed.toLowerCase()
        if (trimmed.length < 5 || trimmed.length > 80) return
        if (BLOCKLIST.some((b: string) => lower.startsWith(b) || lower === b)) return
        if (trimmed.includes('\u2013') || trimmed.includes('\u2014')) return
        bullets.push(trimmed)
      })
    }
    return bullets.slice(0, 12)
  })()
  const floorplans: string[] = rawData?.floorplans || []
  const photoTags = rawData?.photo_tags || null
  const lettingDetails: Record<string, string> = rawData?.letting_details || {}



  // Extract availability from lettingDetails or description
  const availableText: string | null = (() => {
    // Check lettingDetails for any key containing 'available'
    const availKey = Object.keys(lettingDetails).find(k => k.toLowerCase().includes('available'))
    if (availKey) return lettingDetails[availKey]
    // Scan description for availability phrases
    const desc = listing.description || ''
    const m = desc.match(/available\s+(now|immediately|from\s+[\w\s,]+?\d{4}|from\s+\d{1,2}[\s/]\w+|january|february|march|april|may|june|july|august|september|october|november|december)[^.!,]*/i)
    if (m) {
      const val = m[1].trim().replace(/[^a-zA-Z0-9\s]/g, '').trim()
      if (/^(now|immediately)$/i.test(val)) return 'Now'
      return ('From ' + val).slice(0, 30)
    }
    return null
  })()

  let images: string[] = []
  try {
    const raw = listing.images
    images = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
    images = images.filter((u: string) => typeof u === 'string' && u.startsWith('https'))
  } catch {}

  const sizeTextRaw: string | null = rawData?.size_text || null
  let sizeText: string | null = null
  if (sizeTextRaw) {
    const sqftM = sizeTextRaw.match(/([\d,]+)\s*sq\s*ft/i)
    const sqmM = sizeTextRaw.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
    if (sqftM) {
      const sqftVal = parseFloat(sqftM[1].replace(',',''))
      const sqmVal = Math.round(sqftVal * 0.0929)
      sizeText = sqftVal.toLocaleString() + ' sq ft / ' + sqmVal + ' sq m'
    } else if (sqmM) {
      const sqmVal = parseFloat(sqmM[1].replace(',',''))
      const sqftVal = Math.round(sqmVal * 10.764)
      sizeText = sqftVal.toLocaleString() + ' sq ft / ' + sqmVal + ' sq m'
    } else {
      sizeText = sizeTextRaw
    }
  }

  function extractSqm(text: string): number | null {
    if (!text) return null
    const sqmMatch = text.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
    const sqftMatch = text.match(/([\d,]+)\s*sq(?:uare)?\s*f(?:ee|oo)?t/i)
    const sqftMatch2 = text.match(/([\d,]+)\s*ft[²2]/i)
    const sqmMatch2 = text.match(/([\d,]+)\s*m[²2]/i)
    if (sqmMatch) return parseFloat(sqmMatch[1].replace(',', ''))
    if (sqmMatch2) return parseFloat(sqmMatch2[1].replace(',', ''))
    if (sqftMatch) return Math.round(parseFloat(sqftMatch[1].replace(',', '')) * 0.0929)
    if (sqftMatch2) return Math.round(parseFloat(sqftMatch2[1].replace(',', '')) * 0.0929)
    return null
  }

  let rentPerSqm: string = 'Ask agent'
  let resolvedSize: string | null = sizeText

  if (listing.price) {
    let sqm: number | null = null
    if (sizeText) sqm = extractSqm(sizeText)
    if (!sqm && listing.description) {
      sqm = extractSqm(listing.description)
      if (sqm) {
        const sqftFromDesc = Math.round(sqm * 10.764)
        resolvedSize = sqftFromDesc.toLocaleString() + ' sq ft / ' + sqm + ' sq m'
      }
    }
    if (!sqm && keyFeatures.length > 0) {
      for (const f of keyFeatures) {
        sqm = extractSqm(f)
        if (sqm) {
          const sqftFromFeat = Math.round(sqm * 10.764)
          resolvedSize = sqftFromFeat.toLocaleString() + ' sq ft / ' + sqm + ' sq m'
          break
        }
      }
    }
  if (sqm && sqm > 10 && sqm < 10000) {
      rentPerSqm = '£' + Math.round(listing.price / sqm).toLocaleString()
    }
  }

  const isDirectListing = !!listing.agent_id
  const isBuyListing = listing.listing_type === 'buy'

  const TILE_ICONS: Record<string, string> = {
    'Available':    '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/>',
    'Bedrooms':     '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
    'Bathrooms':    '<rect x="8" y="2" width="8" height="4" rx="1" strokeWidth="1.5"/><path d="M7 6h10v1H7z" strokeWidth="1"/><path d="M7 7c0 6 2.5 9 5 9s5-3 5-9" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 16h6" strokeWidth="1.5" strokeLinecap="round"/><rect x="9" y="17" width="6" height="3" rx="0.5" strokeWidth="1.5"/>',
    'Size':         '<path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
    '£/sqm':        '<rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>',
    'Parking':      '<path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
    'Outside Space':'<path d="M12 22V12m0 0C12 7 7 4 7 4s1 5 5 8m0-8c0-5 5-8 5-8s-1 5-5 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
    'EPC Rating':   '<path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
    'Council Tax':  '<path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" strokeWidth="1.5" strokeLinecap="round"/>',
  }
  function TileIcon({ name }: { name: string }) {
    const path = TILE_ICONS[name]
    if (!path) return null
    return (
      <svg className="w-4 h-4 text-[#D85A30] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{__html: path}} />
    )
  }

  // Fetch listings from the user's search context
  let searchListings: any[] = []
  if (fromSearch) {
    try {
      const sp2 = new URLSearchParams(fromSearch)
      const loc = sp2.get('location') || ''
      const minB = sp2.get('minBeds') ? parseInt(sp2.get('minBeds')!) : null
      const maxP = sp2.get('maxPrice') ? parseInt(sp2.get('maxPrice')!) : null
      const minP = sp2.get('minPrice') ? parseInt(sp2.get('minPrice')!) : null
      const furn = sp2.get('furnished') || null
      const ptype = sp2.get('propertyType') || null
      let q = supabase.from('listings').select('id,address,price,images,bedrooms,bathrooms,property_type,borough,latitude,longitude').eq('is_active', true).neq('id', id).limit(6)
      if (loc) {
        const locU = loc.trim().toUpperCase()
        const isPC = /^[A-Z]{1,2}[0-9]{1,2}$/.test(locU)
        if (isPC) q = q.eq('borough', locU)
      }
      if (minB) q = q.gte('bedrooms', minB)
      if (minP) q = q.gte('price', minP)
      if (maxP) q = q.lte('price', maxP)
      if (furn) q = q.ilike('furnished', '%' + furn + '%')
      if (ptype) q = q.ilike('property_type', '%' + ptype + '%')
      const { data: sl } = await q
      searchListings = sl || []
    } catch {}
  }
  const listingPrice: number = typeof listing.price === 'number' ? listing.price : parseInt(String(listing.price || '0'), 10)

  let cleanDescription = listing.description || ''
  const structuredDetails: Record<string, string> = {}
  if (cleanDescription) {
    const markers = ['COUNCIL TAX', 'Read full description', 'Energy performance certificate']
    let cutoff = cleanDescription.length
    for (const m of markers) {
      const idx = cleanDescription.indexOf(m)
      if (idx > 0 && idx < cutoff) cutoff = idx
    }
    const structured = cleanDescription.slice(cutoff)
    cleanDescription = cleanDescription.slice(0, cutoff).trim()
    const parkingMatch = structured.match(/Parking[^\n]*[:\-]\s*([^\n]+)/i)
    if (parkingMatch) structuredDetails['Parking'] = parkingMatch[1].trim()
    const gardenMatch = structured.match(/Garden[^\n]*[:\-]\s*([^\n]+)/i)
    if (gardenMatch) structuredDetails['Garden'] = gardenMatch[1].trim()
    const accessMatch = structured.match(/Accessibility[^\n]*[:\-]\s*([^\n]+)/i)
    if (accessMatch) structuredDetails['Accessibility'] = accessMatch[1].trim()
  }

  // Search ALL text sources for EPC and Council Tax
  const allText = [listing.description || '', ...keyFeatures, JSON.stringify(rawData?.letting_details || {}), JSON.stringify(rawData?.additional || {})].join(' ')

  // Only match EPC band when letter is clearly isolated e.g. 'EPC-B', 'EPC: C', 'EPC Rating B'
  const epcMatch = allText.match(/EPC[\s\-:_]+([A-G])\b/i) ||
                   allText.match(/EPC\s+[Rr]ating[\s:\-]+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Cc]lass[\s:\-]+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Ee]fficiency\s+[Rr]ating\s+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Rr]ating\s+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Ee]fficiency\s+[Rr]ating\s+([A-G])\b/i) ||
                   allText.match(/[Ee]nergy\s+[Rr]ating\s+([A-G])\b/i)
  if (listing.epc_rating) {
    structuredDetails['EPC Rating'] = 'Band ' + listing.epc_rating
  } else {
    structuredDetails['EPC Rating'] = epcMatch ? 'Band ' + epcMatch[1].toUpperCase() : 'Ask agent'
  }

  if (!structuredDetails['Council Tax']) {
    const ctMatch = allText.match(/council.tax.band.{0,3}([A-H])/i) || allText.match(/tax.band.{0,3}([A-H])/i) || allText.match(/council.tax[^A-H]{0,30}([A-H])/i)
    structuredDetails['Council Tax'] = ctMatch ? 'Band ' + ctMatch[1].toUpperCase() : 'Ask agent'
  }

  // Extract which floor the property is on
  const floorText: string | null = (() => {
    const src = (listing.description || '').toLowerCase()
    // Top floor
    if (/\btop floor\b/.test(src)) return 'Top floor'
    // Ground floor
    if (/\bground floor\b/.test(src)) return 'Ground floor'
    // Named ordinals: first, second, third ... twentieth
    const ordinals: Record<string, string> = {
      'first': '1st', 'second': '2nd', 'third': '3rd', 'fourth': '4th',
      'fifth': '5th', 'sixth': '6th', 'seventh': '7th', 'eighth': '8th',
      'ninth': '9th', 'tenth': '10th', 'eleventh': '11th', 'twelfth': '12th',
      'thirteenth': '13th', 'fourteenth': '14th', 'fifteenth': '15th',
      'sixteenth': '16th', 'seventeenth': '17th', 'eighteenth': '18th',
      'nineteenth': '19th', 'twentieth': '20th', 'twenty-first': '21st',
    }
    for (const [word, num] of Object.entries(ordinals)) {
      if (src.includes(word + ' floor')) return num + ' floor'
    }
    // Numeric: 1st, 2nd, 3rd, 21st etc.
    const numMatch = src.match(/\b(\d+(?:st|nd|rd|th))\s+floor\b/)
    if (numMatch) return numMatch[1].charAt(0).toUpperCase() + numMatch[1].slice(1) + ' floor'
    return null
  })()

  // Extract number of floors/levels the property spans
  const floorsText: string | null = (() => {
    const src = (listing.description || '').toLowerCase()
    const kf = keyFeatures.join(' ').toLowerCase()
    const combined = src + ' ' + kf
    // Explicit multi-floor mentions
    if (/split.?level|over two floors|set over 2 floors|two.storey|2.storey|duplex|maisonette/.test(combined)) return '2 floors'
    if (/over three floors|set over 3 floors|three.storey|3.storey|triplex/.test(combined)) return '3 floors'
    // "set over X floors"
    const wordNums: Record<string, string> = { 'two': '2', 'three': '3', 'four': '4' }
    for (const [word, num] of Object.entries(wordNums)) {
      if (combined.includes('over ' + word + ' floor') || combined.includes('across ' + word + ' floor')) return num + ' floors'
    }
    const numMatch = combined.match(/over\s+(\d+)\s+floors?/)
    if (numMatch) return numMatch[1] + ' floors'
    // Single level — flat/apartment/studio with no mention of spanning multiple floors
    if (/\b(flat|apartment|studio)\b/.test(combined) && !/split.?level|over (?:two|three|\d+) floors?|set over|maisonette|duplex|two.storey|three.storey/.test(combined)) return '1 floor'
    return null
  })()

  // Extract parking and outside space — check description AND key features
  console.log('[LISTING TILES] keyFeatures:', keyFeatures, 'desc:', (listing.description || '').slice(0,50))
  const _descClean = (listing.description || '').replace(/^(PARKING|CONCIERGE|GARDEN|ACCESSIBILITY|COUNCIL TAX|EPC|UTILITIES)[\s\S]*$/im, '').toLowerCase()
  const _featuresLower = keyFeatures.map(f => f.toLowerCase())
  const _combined = _descClean + ' ' + _featuresLower.join(' ')

  if (/no[- ]parking|no car park|without parking/.test(_combined)) structuredDetails['Parking'] = 'No'
  else if (/parking (space|bay|permit|available|included|provided)|allocated parking|private parking|secure parking|underground parking|off.street parking|residents.{0,5}parking|\bgarage\b/.test(_combined)) structuredDetails['Parking'] = 'Yes'
  else structuredDetails['Parking'] = 'Ask agent'

  if (/no garden|without a garden|without garden/.test(_combined)) {
    structuredDetails['Outside Space'] = 'No'
  } else {
    const _outsideTypes: string[] = []
    if (/\bgardens?\b/.test(_combined) && !/no garden|without garden/.test(_combined)) _outsideTypes.push('Garden')
    if (/\bbalcon(y|ies)\b/.test(_combined)) _outsideTypes.push('Balcony')
    if (/\bterrace\b/.test(_combined) && !/\bterraced\b/.test(_combined)) _outsideTypes.push('Terrace')
    if (/\bpatio\b/.test(_combined)) _outsideTypes.push('Patio')
    if (/\broof terrace\b/.test(_combined)) _outsideTypes.push('Roof terrace')
    if (_outsideTypes.length > 0) structuredDetails['Outside Space'] = _outsideTypes.join(', ')
    else structuredDetails['Outside Space'] = 'Ask agent'
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      <ListingEventTracker listingId={listing.id} />
      <nav className="border-b border-[#1C2B3A]/10 bg-white relative z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="text-xl font-light text-[#1C2B3A] flex-shrink-0" style={{fontFamily: 'Georgia,serif'}}>nest<span className="text-orange-700 italic">london</span></Link>
          <div className="flex items-center flex-1">
            <NavSearchBar
              location={navLocation}
              listingType={navType}
              minBeds={navMinBeds}
              maxBeds={navMaxBeds}
              minPrice={navMinPrice}
              maxPrice={navMaxPrice}
              radius={navRadius}
              furnished={navFurnished}
              propertyType={navPropertyType}
              features={navFeatures}
              addedWithin={navAddedWithin}
              availableFrom={navAvailableFrom}
              commuteAddress={commuteAddress}
            />
          </div>
          <NavAuthButton variant="light" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <MarkViewed id={id} />
        <Link href="/search" className="text-sm text-stone-500 hover:text-[#1C2B3A] flex items-center gap-1 mb-4">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to search
        </Link>

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-[#1C2B3A] mb-1" style={{fontFamily: 'Georgia, serif'}}>{listing.address}</h1>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1C2B3A]" style={{fontFamily: 'Georgia, serif'}}>£{listing.price?.toLocaleString()}</span>
            {!isBuyListing && <span className="text-stone-400 text-sm">per month</span>}
            {!isBuyListing && listing.price && <span className="text-stone-400 text-sm">£{Math.round(listing.price / 4.33).toLocaleString()} per week</span>}
            {isBuyListing && <span className="text-stone-400 text-sm">asking price</span>}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">Studio</span> : listing.bedrooms ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.bedrooms} bed</span> : null}
            {listing.bathrooms ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.bathrooms} bath</span> : null}
            {listing.property_type && <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.property_type}</span>}
            {floorText && <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{floorText}</span>}
            {floorsText && <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{floorsText}</span>}
          </div>
          <div className="mt-3">
            <PhotoTags listingId={listing.id} initialTags={photoTags} />
          </div>
        </div>
      </div>

      {/* Full width photos */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <ImageGallery images={images} address={listing.address} floorplans={floorplans} listedAt={listing.listed_at} epcRating={listing.epc_rating} epcScore={listing.epc_score} epcPotentialRating={listing.epc_potential_rating} epcPotentialScore={listing.epc_potential_score} shareButton={<><SaveButton listingId={listing.id} /><ShareButton address={listing.address} price={listing.price} /></>} />
        <div className="flex justify-end mt-2">
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-5">


            {Object.keys(lettingDetails).length > 0 && (
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">{isBuyListing ? 'Property details' : 'Letting details'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(lettingDetails).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-stone-400">{k}</div>
                      <div className="text-sm text-[#1C2B3A] font-semibold">{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 items-stretch">
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <TileIcon name="Available" />
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{isBuyListing ? 'Tenure' : 'Available'}</div>
                <div className="text-sm font-semibold text-[#374151]">{isBuyListing ? ((() => {
                  const ld = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
                  const ldTenure = ld?.letting_details?.Tenure
                  if (ldTenure) return ldTenure
                  // Check key features for tenure
                  const kfTenure = (ld?.key_features || []).find((f: string) => /tenure/i.test(f))
                  if (kfTenure) { const m = kfTenure.match(/tenure[:\s]+(.+)/i); if (m) return m[1].trim() }
                  const t = (listing.description || '').match(/freehold|leasehold|share of freehold/i)
                  return t ? t[0].replace(/^\w/, (c: string) => c.toUpperCase()) : 'Ask agent'
                })()) : (availableText || 'Ask agent')}</div>
              </div>
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <TileIcon name="Bedrooms" />
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Bedrooms</div>
                <div className="text-sm font-semibold text-[#374151]">{(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? 'Studio' : (listing.bedrooms ?? '—')}</div>
              </div>
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                <TileIcon name="Bathrooms" />
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Bathrooms</div>
                <div className="text-sm font-semibold text-[#374151]">{listing.bathrooms ?? '—'}</div>
              </div>
              {resolvedSize ? (
                <>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="Size" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
                    <div className="text-sm font-semibold text-[#374151]">{resolvedSize}</div>
                  </div>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="£/sqm" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/sqm</div>
                    <div className="text-sm font-semibold text-[#374151]">{rentPerSqm}</div>
                  </div>
                </>
              ) : floorplans.length > 0 ? (
                <FloorplanSize key={floorplans[0]} floorplanUrl={floorplans[0]} price={listingPrice} />
              ) : (
                <>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="Size" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
                    <div className="text-sm font-semibold text-[#374151]">Ask agent</div>
                  </div>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="£/sqm" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/sqm</div>
                    <div className="text-sm font-semibold text-[#374151]">Ask agent</div>
                  </div>
                </>
              )}

            </div>

            {keyFeatures.length > 0 && (
              <KeyFeatures features={keyFeatures} />
            )}

            {Object.keys(structuredDetails).length > 0 && (
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#1C2B3A] mb-3">Property details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(structuredDetails).map(([k, v]) => (
                    <div key={k} className="bg-[#F5F0EB] rounded-xl p-3 text-center flex flex-col items-center justify-center">
                      <TileIcon name={k} />
                      <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{k}</div>
                      <div className="text-sm font-semibold text-[#1C2B3A]">{v as string}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cleanDescription && (
              <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#1C2B3A] mb-3">Description</h2>
                <div className="text-sm text-[#4A5568] leading-relaxed whitespace-pre-line">{cleanDescription}</div>
              </div>
            )}

            {listing.latitude && listing.longitude && (
              <PropertyMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                address={listing.address}
                price={listing.price}
                nearbyListings={nearbyListings}
                listingType={isBuyListing ? 'buy' : 'rent'}
              />
            )}

            <CommuteWidget
              listingPostcode={listing.postcode}
              listingLat={listing.latitude ? parseFloat(String(listing.latitude)) : null}
              listingLng={listing.longitude ? parseFloat(String(listing.longitude)) : null}
              initialCommuteAddress={commuteAddress}
            />

            <div className="text-xs text-stone-400 pt-2">
              Listed on {listing.source}
              {(() => {
                const urls = typeof listing.source_urls === 'string' ? JSON.parse(listing.source_urls || '{}') : (listing.source_urls || {})
                const entries = Object.entries(urls) as [string,string][]
                if (entries.length > 0) return (
                  <span>{entries.map(([src, url]) => (
                    <span key={src}> · <a href={url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">View on {src}</a></span>
                  ))}</span>
                )
                if (listing.source_url) return (
                  <span> · <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">View original listing</a></span>
                )
                return null
              })()}
            </div>
          </div>

          <div className="flex flex-col gap-5 self-start">
            {isBuyListing ? (
              <BuyListingPanel
                price={listingPrice}
                address={listing.address}
                sourceUrl={listing.source_url || null}
                source={listing.source || null}
              />
            ) : isDirectListing ? (
              <ContactOwnerPanel listingId={listing.id} address={listing.address} />
            ) : (
              <>
                <ExternalLinkCard listing={listing} />
              </>
            )}

            {searchListings.length > 0 && (
              <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">From your search</h3>
                <div className="flex flex-col gap-3">
                  {searchListings.map((sl: any) => {
                    let slImg: string | null = null
                    try {
                      const arr = typeof sl.images === 'string' ? JSON.parse(sl.images) : (sl.images || [])
                      slImg = arr.find((u: string) => u?.startsWith('https')) || null
                    } catch {}
                    return (
                      <a key={sl.id} href={'/listings/' + sl.id + (fromSearch ? '?from=' + encodeURIComponent(fromSearch) : '')} className="flex gap-3 group">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          {slImg ? <img src={slImg} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-stone-100" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[#1C2B3A] truncate group-hover:text-orange-700 transition-colors">{sl.address}</div>
                          <div className="text-sm font-semibold text-[#1C2B3A] mt-0.5">£{sl.price?.toLocaleString()}<span className="text-xs text-stone-400 font-normal">/mo</span></div>
                          <div className="text-xs text-stone-400">{sl.bedrooms ? sl.bedrooms + ' bed' : ''}{sl.property_type ? ' · ' + sl.property_type : ''}</div>
                        </div>
                      </a>
                    )
                  })}
                </div>
                {fromSearch && (
                  <a href={'/search' + fromSearch} className="block text-center text-xs text-orange-700 hover:underline mt-4">Back to search results →</a>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
    </main>
  )
}

function KeyFeatures({ features }: { features: string[] }) {
  function toSentenceCase(str: string) {
    // Only convert if mostly uppercase
    const upper = (str.match(/[A-Z]/g) || []).length
    const lower = (str.match(/[a-z]/g) || []).length
    if (upper <= lower) return str
    // Words that should always be capitalised
    const ALWAYS_CAPS = new Set(['london', 'uk', 'england', 'epc', 'tv', 'lcd', 'led', 'hd', 'wifi', 'cctv'])
    // Units and abbreviations to keep lowercase
    const KEEP_LOWER = new Set(['sq', 'ft', 'mi', 'm', 'km'])
    const lower_str = str.toLowerCase()
    return lower_str.charAt(0).toUpperCase() + lower_str.slice(1).replace(/\b([a-z]+)\b/g, (word) => {
      if (ALWAYS_CAPS.has(word)) return word.toUpperCase()
      if (KEEP_LOWER.has(word)) return word
      return word
    })
  }
  const filtered = Array.from(new Set(features.map(f => toSentenceCase(f.trim().replace(/^[-–—•*]+\s*/, ''))))).filter(f => {
    const l = f.toLowerCase()
    return !l.startsWith('epc') && !l.startsWith('council tax') &&
           !l.includes('property ref') && !l.includes('reference number') &&
           f.trim().length > 2
  })
  if (filtered.length === 0) return null
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#1C2B3A] mb-3">Key Features</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        {filtered.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-[#374151]">
            <svg className="w-4 h-4 text-[#D85A30] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExternalLinkCard({ listing }: { listing: any }) {
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
      <div className="mb-4">
        <div className="text-2xl font-bold text-[#1C2B3A] mb-0.5" style={{fontFamily: 'Georgia, serif'}}>£{listing.price?.toLocaleString()}</div>
        <div className="text-sm text-stone-400">per month{listing.price ? <> · £{Math.round(listing.price / 4.33).toLocaleString()} pw</> : null}</div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">Studio</span> : listing.bedrooms ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.bedrooms} bed</span> : null}
        {listing.bathrooms ? <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.bathrooms} bath</span> : null}
        {listing.property_type && <span className="text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full">{listing.property_type}</span>}
      </div>
      {['Private owner', 'Landlord'].includes(listing.source) ? (
        <ContactOwnerPanel listingId={listing.id} address={listing.address} />
      ) : listing.source_url ? (
        <>
          <a href={listing.source_url} target="_blank" rel="noopener noreferrer"
            className="block w-full text-white text-sm rounded-xl py-3 text-center transition-opacity hover:opacity-90 mb-3"
            style={{background:'#D3755A'}}>
            View on {listing.source} →
          </a>
          <p className="text-xs text-[#9B928E] text-center">Enquire directly on {listing.source}. NestLondon does not charge tenants any fees.</p>
        </>
      ) : (
        <div className="w-full bg-stone-100 text-[#9B928E] text-sm rounded-xl py-3 text-center">Source unavailable</div>
      )}
    </div>
  )
}

// EnquiryForm moved to separate client component — see below
function EnquiryFormPlaceholder() { return null }
