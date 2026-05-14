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
import TileIcon from '@/components/TileIcon'
import PillStat from '@/components/PillStat'
import PropertyDetailsTiles from '@/components/PropertyDetailsTiles'
import ShareButton from '@/components/ShareButton'
import SaveButton from '@/components/SaveButton'
import PhotoTags from '@/components/PhotoTags'
import ListingEventTracker from '@/components/ListingEventTracker'
import CommuteWidget from '@/components/CommuteWidget'
import BuyListingPanel from '@/components/BuyListingPanel'
import BoroughGuideInline from '@/components/BoroughGuideInline'
import { getBoroughByPostcode } from '@/data/boroughGuides'
import { parseCommuteLocations, migrateLegacyCommute, type CommuteLocation } from '@/lib/commute'

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
  const navCommuteLocations: CommuteLocation[] = parseCommuteLocations(navSp.get('commute'))
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  // Always use service role for the listing fetch so we can see non-live rows
  // (pending/paused/deactivated) for the owner preview path. Auth + ownership
  // + status gating happens below, so this is safe.
  const isAdminPreviewEarly = sp.preview === 'true'
  const queryClient = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: listing } = await queryClient
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!listing) notFound()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const commuteAddress = currentUser?.user_metadata?.commute_address || null
  const commuteMode = currentUser?.user_metadata?.commute_mode || null
  // Multi-location commute. URL (from clicked search) wins; otherwise migrate from user metadata
  // (which may itself be the legacy singular commute_address surfaced as a virtual location).
  const commuteLocations: CommuteLocation[] = navCommuteLocations.length > 0
    ? navCommuteLocations
    : migrateLegacyCommute(currentUser?.user_metadata?.commute_locations, commuteAddress, commuteMode)

  // Ownership check (matches dashboards' logic)
  const listingRawData = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
  const ownsByAgent = !!(currentUser && listing.agent_id && currentUser.id === listing.agent_id)
  const ownsByEmail = !!(currentUser?.email && (listingRawData?.contact?.email || '').toLowerCase() === currentUser.email.toLowerCase())
  const isOwnListing = ownsByAgent || ownsByEmail

  // Status-driven visibility:
  //   live          → public, full features
  //   deactivated   → public via URL (was approved once), banner + faded, no enquiry
  //   paused        → owner only (admin queue was withdrawn before approval)
  //   pending       → owner only (never approved)
  const listingStatus = listing.status as string | null
  const isLive = listingStatus === 'live' || (listingStatus == null && listing.is_active)
  const isAdmin = currentUser?.user_metadata?.role === 'admin'
  const wasApproved = listingStatus === 'deactivated'
  const publicViewable = isLive || wasApproved
  if (!publicViewable && !isOwnListing && !isAdmin && !isAdminPreviewEarly) notFound()
  const userRole = currentUser?.user_metadata?.role as string | undefined
  const isOwnerOrAgent = !!(userRole && (userRole.startsWith('owner') || userRole.startsWith('agent') || userRole === 'landlord' || userRole === 'admin'))
  const blockEnquiry = !!(currentUser && isOwnerOrAgent && !isOwnListing)

  const isAdminPreview = isAdminPreviewEarly

  let nearbyListings: any[] = []
  if (listing.latitude && listing.longitude) {
    const { data: nearby } = await supabase
      .from('listings')
      .select('id,address,price,latitude,longitude,bedrooms,bathrooms,property_type,images,listing_type,description,raw_data')
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
      sizeText = sqftVal.toLocaleString() + ' sq ft'
    } else if (sqmM) {
      const sqmVal = parseFloat(sqmM[1].replace(',',''))
      const sqftVal = Math.round(sqmVal * 10.764)
      sizeText = sqftVal.toLocaleString() + ' sq ft'
    } else {
      sizeText = sizeTextRaw
    }
  }

  // Price per sqm/sqft
  let pricePerSqm: number | null = null
  let pricePerSqft: number | null = null
  if (sizeTextRaw && listing.price) {
    const sqftM2 = sizeTextRaw.match(/([\d,]+)\s*sq\s*ft/i)
    const sqmM2 = sizeTextRaw.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
    let sqmV: number | null = null
    let sqftV: number | null = null
    if (sqftM2) { sqftV = parseFloat(sqftM2[1].replace(',','')); sqmV = Math.round(sqftV * 0.0929) }
    else if (sqmM2) { sqmV = parseFloat(sqmM2[1].replace(',','')); sqftV = Math.round(sqmV * 10.764) }
    if (sqmV && sqmV > 0) pricePerSqm = Math.round(listing.price / sqmV)
    if (sqftV && sqftV > 0) pricePerSqft = Math.round(listing.price / sqftV)
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
    // Skip description fallback — descriptions frequently mention sizes of nearby buildings/areas, never reliable
    if (!sqm && keyFeatures.length > 0) {
      for (const f of keyFeatures) {
        const candidate = extractSqm(f)
        // Sanity-check: realistic property range 15–1000 sqm
        if (candidate && candidate >= 15 && candidate <= 1000) {
          sqm = candidate
          const sqftFromFeat = Math.round(candidate * 10.764)
          resolvedSize = sqftFromFeat.toLocaleString() + ' sq ft'
          break
        }
      }
    }
    // Sanity-check sqm from sizeText too — if out of realistic range, ignore it
    if (sqm && (sqm < 15 || sqm > 1000)) {
      sqm = null
      resolvedSize = sizeText // revert
    }
  if (sqm && sqm > 10 && sqm < 10000) {
      rentPerSqm = '£' + Math.round(listing.price / sqm).toLocaleString()
    }
  }

  const isDirectListing = !!listing.agent_id
  const isBuyListing = listing.listing_type === 'buy'


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
      let q = supabase.from('listings').select('id,address,price,images,bedrooms,bathrooms,property_type,borough,latitude,longitude,listing_type,description,raw_data').eq('is_active', true).eq('listing_type', listing.listing_type || 'rent').neq('id', id).limit(6)
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
  if (listing.epc_rating && listing.epc_rating !== 'not_found') {
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
  // Pull in photo_tags.features — these are structured signals (e.g. 'Balcony visible', 'Garden visible')
  const _photoTagsLower = (rawData?.photo_tags?.features || []).map((f: string) => f.toLowerCase())
  const _combined = _descClean + ' ' + _featuresLower.join(' ') + ' ' + _photoTagsLower.join(' ')

  if (/no[- ]parking|no car park|without parking/.test(_combined)) structuredDetails['Parking'] = 'No'
  else if (/parking (space|bay|permit|available|included|provided)|allocated parking|private parking|secure parking|underground parking|off.street parking|residents.{0,5}parking|\bgarage\b/.test(_combined)) structuredDetails['Parking'] = 'Yes'
  else structuredDetails['Parking'] = 'Ask agent'

  if (/no garden|without a garden|without garden/.test(_combined)) {
    structuredDetails['Outside Space'] = 'No'
  } else {
    const _outsideTypes: string[] = []
    // Garden — require qualifier OR signal in structured fields. Avoid 'Hatton Garden' (location) etc.
    const gardenStructured = _featuresLower.some((f: string) => /\bgardens?\b/.test(f)) || _photoTagsLower.some((f: string) => /\bgardens?\b/.test(f))
    const gardenQualified = /\b(private|own|rear|south.facing|landscaped|communal)\s+gardens?\b/.test(_combined)
    if ((gardenStructured || gardenQualified) && !/no garden|without garden/.test(_combined)) _outsideTypes.push('Garden')
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
              commuteLocations={commuteLocations}
            />
          </div>
          <Link href="/boroughs" className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0 no-underline mr-2">Borough guides</Link>
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
            {(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? <PillStat icon="bed" label="Studio" /> : listing.bedrooms ? <PillStat icon="bed" label={`${listing.bedrooms} bed`} /> : null}
            {listing.bathrooms ? <PillStat icon="bath" label={`${listing.bathrooms} bath`} /> : null}
            {listing.property_type && <PillStat icon="home" label={listing.property_type} />}
            {floorText && <PillStat icon="floor" label={floorText} />}
            {floorsText && <PillStat icon="floor" label={floorsText} />}
          </div>
          <div className="mt-3">
            <PhotoTags listingId={listing.id} initialTags={photoTags} />
          </div>
        </div>
      </div>

      {!isLive && (
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <div className="rounded-2xl border border-[#E8C9B0] bg-[#FCF5EE] p-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#D3755A20'}}>
              <svg className="w-4 h-4" fill="none" stroke="#D3755A" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#1B2E4B] pt-0.5">This listing is currently unavailable</p>
          </div>
        </div>
      )}

      {/* Full width photos */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <ImageGallery isLive={isLive} images={images} address={listing.address} floorplans={floorplans} listedAt={listing.listed_at} epcRating={listing.epc_rating} epcScore={listing.epc_score} epcPotentialRating={listing.epc_potential_rating} epcPotentialScore={listing.epc_potential_score} shareButton={<div className="flex items-center gap-1"><ShareButton address={listing.address} price={listing.price} /><span className="w-px h-5 bg-[#E8E2DA] mx-1" aria-hidden="true" /><SaveButton listingId={listing.id} /></div>} />
        <div className="flex justify-end mt-2">
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-5">



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
                    {resolvedSize && resolvedSize.includes('sq ft') && <div className="text-xs text-stone-400 mt-0.5">{Math.round(parseFloat(resolvedSize.replace(/,/g,'')) * 0.0929).toLocaleString()} sq m</div>}
                  </div>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="£/sqm" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Price / size</div>
                    <div className="text-sm font-semibold text-[#374151]">{pricePerSqft ? '£' + pricePerSqft.toLocaleString() + ' / sq ft' : 'Ask agent'}</div>
                    {pricePerSqm && <div className="text-xs text-stone-400 mt-0.5">£{pricePerSqm.toLocaleString()} / sq m</div>}
                  </div>
                </>
              ) : floorplans.length > 0 ? (
                <FloorplanSize key={floorplans[0]} floorplanUrl={floorplans[0]} price={listingPrice} listingId={listing.id} />
              ) : (
                <>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="Size" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
                    <div className="text-sm font-semibold text-[#374151]">Ask agent</div>
                  </div>
                  <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
                    <TileIcon name="£/sqm" />
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Price / size</div>
                    <div className="text-sm font-semibold text-[#374151]">Ask agent</div>
                  </div>
                </>
              )}

            </div>

            {keyFeatures.length > 0 && (
              <KeyFeatures features={keyFeatures} />
            )}

            <PropertyDetailsTiles
              details={structuredDetails}
              epcRating={(listing.epc_rating && listing.epc_rating !== 'not_found') ? listing.epc_rating : (epcMatch ? epcMatch[1].toUpperCase() : null)}
              epcScore={listing.epc_score || null}
              epcPotentialRating={listing.epc_potential_rating || null}
              epcPotentialScore={listing.epc_potential_score || null}
            />

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
              initialCommuteMode={commuteMode}
              initialCommuteLocations={commuteLocations}
            />

            {(() => {
              const _borough = getBoroughByPostcode(listing.postcode || listing.address || '')
              return _borough ? <BoroughGuideInline borough={_borough} /> : null
            })()}

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
            {!isLive ? (
              isOwnListing ? (
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 text-center">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Your listing</p>
                  <a href={userRole?.startsWith('agent') ? '/dashboard?tab=listings' : '/dashboard/owner'}
                    className="block w-full text-white text-sm rounded-xl py-3 text-center transition-opacity hover:opacity-90 no-underline"
                    style={{background:'#D3755A'}}>
                    View in my portal →
                  </a>
                </div>
              ) : (
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 text-center">
                  <p className="text-sm font-medium text-[#1B2E4B]">Unavailable</p>
                </div>
              )
            ) : isBuyListing ? (
              <BuyListingPanel
                price={listingPrice}
                address={listing.address}
                sourceUrl={listing.source_url || null}
                source={listing.source || null}
              />
            ) : isDirectListing ? (
              isOwnListing ? (
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 text-center">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Your listing</p>
                  <a href={userRole?.startsWith('agent') ? '/dashboard?tab=listings' : '/dashboard/owner'}
                    className="block w-full text-white text-sm rounded-xl py-3 text-center transition-opacity hover:opacity-90 no-underline"
                    style={{background:'#D3755A'}}>
                    View in my portal →
                  </a>
                </div>
              ) : blockEnquiry ? (
                <ResidentAccountPrompt />
              ) : (
                <ContactOwnerPanel listingId={listing.id} address={listing.address} />
              )
            ) : (
              <>
                <ExternalLinkCard listing={listing} isOwnListing={isOwnListing} userRole={userRole} blockEnquiry={blockEnquiry} />
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

function ResidentAccountPrompt() {
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(211,117,90,0.12)'}}>
        <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="text-base font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>Create a resident account to enquire</h3>
      <p className="text-xs text-[#9B928E] mb-4">Your current account is set up for listing properties. To request details, book a viewing, or make an offer, create a resident account.</p>
      <a href="/auth/signup?role=resident" className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-medium no-underline transition-opacity hover:opacity-90" style={{background:'#D3755A'}}>
        Create a resident account
      </a>
    </div>
  )
}

function ExternalLinkCard({ listing, isOwnListing, userRole, blockEnquiry }: { listing: any; isOwnListing: boolean; userRole: string | undefined; blockEnquiry?: boolean }) {
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
      <div className="mb-4">
        <div className="text-2xl font-bold text-[#1C2B3A] mb-0.5" style={{fontFamily: 'Georgia, serif'}}>£{listing.price?.toLocaleString()}</div>
        <div className="text-sm text-stone-400">per month{listing.price ? <> · £{Math.round(listing.price / 4.33).toLocaleString()} pw</> : null}</div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(listing.bedrooms === 0 || String(listing.bedrooms) === '0' || /studio/i.test(listing.property_type || '')) ? <PillStat icon="bed" label="Studio" /> : listing.bedrooms ? <PillStat icon="bed" label={`${listing.bedrooms} bed`} /> : null}
        {listing.bathrooms ? <PillStat icon="bath" label={`${listing.bathrooms} bath`} /> : null}
        {listing.property_type && <PillStat icon="home" label={listing.property_type} />}
      </div>
      {['Private owner', 'Landlord'].includes(listing.source) ? (
        isOwnListing ? (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 text-center">
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">Your listing</p>
            <a href={userRole?.startsWith('agent') ? '/dashboard?tab=listings' : '/dashboard/owner'}
              className="block w-full text-white text-sm rounded-xl py-3 text-center transition-opacity hover:opacity-90 no-underline"
              style={{background:'#D3755A'}}>
              View in my portal →
            </a>
          </div>
        ) : blockEnquiry ? (
          <ResidentAccountPrompt />
        ) : (
          <ContactOwnerPanel listingId={listing.id} address={listing.address} />
        )
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
