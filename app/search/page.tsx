export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import NavSearchBar from '@/components/NavSearchBar'
import NavAuthButton from '@/components/NavAuthButton'
import SearchFilters from '@/components/SearchFilters'
import ListingCard from '@/components/ListingCard'
import { SearchResults } from '@/components/SearchResults'
import { parseCommuteLocations, migrateLegacyCommute, type CommuteLocation } from '@/lib/commute'

// Load list of London postcode district names from boundaries data (server-side)
import { readFileSync } from 'fs'
import path from 'path'
let LONDON_POSTCODE_DISTRICTS: string[] = []
try {
  const p = path.join(process.cwd(), 'public', 'boundaries', 'postcodes.json')
  const data = JSON.parse(readFileSync(p, 'utf8'))
  LONDON_POSTCODE_DISTRICTS = (data.features || []).map((f: any) => f.properties?.name).filter(Boolean)
} catch {}


interface SearchParams {
  location?: string
  type?: string
  minBeds?: string
  maxBeds?: string
  minPrice?: string
  maxPrice?: string
  furnished?: string
  propertyType?: string
  features?: string
  radius?: string
  addedWithin?: string
  availableFrom?: string
  minSize?: string
  maxSize?: string
  floorLayout?: string
  style?: string
  commute?: string  // pipe/comma-encoded multi-location list: label|address|timeLimit|mode,...
  tenure?: string
  chainFree?: string
  newBuild?: string
  leaseholdMin?: string
  minBaths?: string
  maxBaths?: string
  maxPricePerSqm?: string
  minPricePerSqm?: string
  nestOnly?: string
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const location = params.location || ''
  const listingType = params.type || 'rent'
  const minBeds = params.minBeds ? parseInt(params.minBeds) : null
  const maxBeds = params.maxBeds ? parseInt(params.maxBeds) : null
  const minPrice = params.minPrice ? parseInt(params.minPrice) : null
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : null
  const furnished = params.furnished || null
  const propertyType = params.propertyType || null
  const features = params.features ? params.features.split(',') : []
  const radius = params.radius ? parseFloat(params.radius) : null // miles
  const addedWithin = params.addedWithin ? parseFloat(params.addedWithin) : null // days (can be fractional for hours)
  const availableFrom = params.availableFrom || null
  const minSize = params.minSize ? parseInt(params.minSize) : null
  const maxSize = params.maxSize ? parseInt(params.maxSize) : null
  const floorLayout = params.floorLayout || null
  const style = params.style || null
  const tenure = params.tenure || null
  const chainFree = params.chainFree === 'true'
  const newBuild = params.newBuild === 'true'
  const leaseholdMin = params.leaseholdMin ? parseInt(params.leaseholdMin) : null
  const minBaths = params.minBaths ? parseInt(params.minBaths) : null
  const maxBaths = params.maxBaths ? parseInt(params.maxBaths) : null
  const maxPricePerSqm = params.maxPricePerSqm ? parseInt(params.maxPricePerSqm) : null
  const minPricePerSqm = params.minPricePerSqm ? parseInt(params.minPricePerSqm) : null
  const nestOnly = params.nestOnly === '1'
  // Get saved commute address from user profile if not in URL
  // Legacy singular commute_address/mode read from user metadata as a fallback for
  // migrateLegacyCommute (folds old singular field into commute_locations). URL no longer
  // carries these — the encoded `commute=` param is the source of truth for filtering.
  let commuteAddress: string | null = null
  let commuteMode: string | null = null
  // Multi-location commute: URL param wins; fall back to user_metadata.commute_locations,
  // which itself falls back to the legacy singular commute_address via migrateLegacyCommute.
  let commuteLocations: CommuteLocation[] = params.commute ? parseCommuteLocations(params.commute) : []
  if (!commuteAddress || !commuteMode || commuteLocations.length === 0) {
    try {
      const cookieStore = await cookies()
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await supabaseAuth.auth.getUser()
      const meta = user?.user_metadata || {}
      if (!commuteAddress && meta.commute_address) commuteAddress = meta.commute_address
      if (!commuteMode && meta.commute_mode) commuteMode = meta.commute_mode
      if (commuteLocations.length === 0) {
        commuteLocations = migrateLegacyCommute(meta.commute_locations, meta.commute_address, meta.commute_mode)
      }
    } catch {}
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const isBuyMode = listingType === 'buy'
  let query = supabase.from('listings').select('*').eq('is_active', true).is('canonical_listing_id', null).order('scraped_at', { ascending: false }).limit(200)
  query = query.eq('listing_type', isBuyMode ? 'buy' : 'rent')
  if (nestOnly) query = query.neq('source', 'Rightmove').neq('source', 'rightmove')


  // Geocode location to lat/lng for map centering and radius filtering
  let locationCoords: { lat: number, lng: number } | null = null

  // London postcode district centres (avoids Nominatim mismatches)
  const POSTCODE_COORDS: Record<string, [number, number]> = {
    'EC1': [51.5223, -0.0988], 'EC2': [51.5178, -0.0823], 'EC3': [51.5107, -0.0799], 'EC4': [51.5138, -0.1015],
    'WC1': [51.5228, -0.1212], 'WC2': [51.5121, -0.1228],
    'E1': [51.5154, -0.0708], 'E2': [51.5277, -0.0549], 'E3': [51.5271, -0.0209], 'E4': [51.6271, -0.0108],
    'E5': [51.5589, -0.0575], 'E6': [51.5316, 0.0638], 'E7': [51.5506, 0.0344], 'E8': [51.5415, -0.0594],
    'E9': [51.5432, -0.0215], 'E10': [51.5698, -0.0059], 'E11': [51.5688, 0.0088], 'E12': [51.5501, 0.0601],
    'E13': [51.5313, 0.0196], 'E14': [51.5051, -0.0209], 'E15': [51.5415, -0.0042], 'E16': [51.5093, 0.0274],
    'E17': [51.5882, -0.0197], 'E18': [51.5922, 0.0277],
    'N1': [51.5362, -0.1033], 'N2': [51.5872, -0.1649], 'N3': [51.5999, -0.1926], 'N4': [51.5704, -0.0985],
    'N5': [51.5586, -0.1059], 'N6': [51.5778, -0.1459], 'N7': [51.5527, -0.1133], 'N8': [51.5904, -0.1025],
    'N9': [51.6221, -0.0601], 'N10': [51.6022, -0.1219], 'N11': [51.6163, -0.1329], 'N12': [51.6090, -0.1883],
    'N13': [51.6231, -0.1098], 'N14': [51.6367, -0.1329], 'N15': [51.5823, -0.0749], 'N16': [51.5635, -0.0740],
    'N17': [51.5976, -0.0725], 'N18': [51.6097, -0.0725], 'N19': [51.5569, -0.1376], 'N20': [51.6280, -0.1780],
    'N21': [51.6378, -0.1008], 'N22': [51.5976, -0.1098],
    'NW1': [51.5308, -0.1238], 'NW2': [51.5487, -0.2222], 'NW3': [51.5503, -0.1643], 'NW4': [51.5833, -0.2268],
    'NW5': [51.5503, -0.1408], 'NW6': [51.5466, -0.2041], 'NW7': [51.6087, -0.2026], 'NW8': [51.5295, -0.1858],
    'NW9': [51.5844, -0.2786], 'NW10': [51.5325, -0.2411], 'NW11': [51.5723, -0.1942],
    'SE1': [51.5044, -0.1052], 'SE2': [51.4985, 0.0706], 'SE3': [51.4781, -0.0147], 'SE4': [51.4449, -0.0533],
    'SE5': [51.4697, -0.0694], 'SE6': [51.4268, -0.0133], 'SE7': [51.4851, 0.0706], 'SE8': [51.4764, -0.0326],
    'SE9': [51.4531, 0.0706], 'SE10': [51.4831, -0.0098], 'SE11': [51.4884, -0.1050], 'SE12': [51.4449, 0.0033],
    'SE13': [51.4571, -0.0133], 'SE14': [51.4757, -0.0403], 'SE15': [51.4697, -0.0694], 'SE16': [51.4937, -0.0498],
    'SE17': [51.4884, -0.1050], 'SE18': [51.4900, 0.0691], 'SE19': [51.4144, -0.0833], 'SE20': [51.4144, -0.0533],
    'SE21': [51.4144, -0.0833], 'SE22': [51.4571, -0.0533], 'SE23': [51.4449, -0.0533], 'SE24': [51.4568, -0.1050],
    'SE25': [51.3933, -0.0651], 'SE26': [51.4268, -0.0533], 'SE27': [51.4268, -0.1050], 'SE28': [51.5007, 0.1157],
    'SW1': [51.4965, -0.1441], 'SW2': [51.4568, -0.1228], 'SW3': [51.4870, -0.1607], 'SW4': [51.4618, -0.1386],
    'SW5': [51.4900, -0.1937], 'SW6': [51.4753, -0.2010], 'SW7': [51.4941, -0.1738], 'SW8': [51.4712, -0.1333],
    'SW9': [51.4723, -0.1228], 'SW10': [51.4803, -0.1950], 'SW11': [51.4647, -0.1607], 'SW12': [51.4431, -0.1527],
    'SW13': [51.4733, -0.2432], 'SW14': [51.4677, -0.2851], 'SW15': [51.4596, -0.2122], 'SW16': [51.4268, -0.1323],
    'SW17': [51.4277, -0.1680], 'SW18': [51.4445, -0.2068], 'SW19': [51.4214, -0.2064], 'SW20': [51.4025, -0.2064],
    'W1': [51.5152, -0.1415], 'W2': [51.5154, -0.1755], 'W3': [51.5088, -0.2634], 'W4': [51.4942, -0.2685],
    'W5': [51.5148, -0.3016], 'W6': [51.4934, -0.2239], 'W7': [51.5006, -0.3238], 'W8': [51.5010, -0.1921],
    'W9': [51.5233, -0.1836], 'W10': [51.5210, -0.2010], 'W11': [51.5094, -0.1967], 'W12': [51.5122, -0.2245],
    'W13': [51.5174, -0.3016], 'W14': [51.4900, -0.2063],
    'TW1': [51.4504, -0.3236], 'TW2': [51.4504, -0.3558], 'TW3': [51.4726, -0.3630], 'TW4': [51.4737, -0.3863],
    'TW5': [51.4806, -0.3526], 'TW6': [51.4713, -0.4524], 'TW7': [51.4740, -0.3521], 'TW8': [51.4908, -0.2750],
    'TW9': [51.4677, -0.2851], 'TW10': [51.4633, -0.3012], 'TW11': [51.4214, -0.3236], 'TW12': [51.4214, -0.3558],
    'TW13': [51.4214, -0.3863], 'TW14': [51.4664, -0.4237],
    'KT1': [51.4104, -0.2986], 'KT2': [51.4214, -0.2986], 'KT3': [51.4025, -0.2558], 'KT4': [51.3786, -0.2558],
    'KT5': [51.3786, -0.2986], 'KT6': [51.3786, -0.3236], 'KT7': [51.3786, -0.3558], 'KT8': [51.4104, -0.3558],
    'HA0': [51.5524, -0.2963], 'HA1': [51.5793, -0.3353], 'HA2': [51.5630, -0.3521], 'HA3': [51.5819, -0.3168],
    'HA4': [51.5713, -0.4277], 'HA5': [51.5931, -0.3802], 'HA6': [51.6103, -0.4231], 'HA7': [51.6194, -0.3028],
    'HA8': [51.6133, -0.2751], 'HA9': [51.5635, -0.2795],
    'UB1': [51.5484, -0.3683], 'UB2': [51.5065, -0.3683], 'UB3': [51.5065, -0.4127], 'UB4': [51.5484, -0.4127],
    'UB5': [51.5484, -0.3464], 'UB6': [51.5423, -0.3464], 'UB7': [51.5065, -0.4783], 'UB8': [51.5462, -0.4783],
    'RM1': [51.5748, 0.2143], 'RM2': [51.5748, 0.2337], 'RM3': [51.5748, 0.2513], 'RM4': [51.5748, 0.2743],
    'RM5': [51.5748, 0.1480], 'RM6': [51.5748, 0.1284], 'RM7': [51.5748, 0.1118], 'RM8': [51.5440, 0.1118],
    'RM9': [51.5397, 0.1118], 'RM10': [51.5410, 0.1284], 'RM11': [51.5578, 0.2143], 'RM12': [51.5542, 0.2133],
    'RM13': [51.5397, 0.1980], 'RM14': [51.5590, 0.2513],
    'IG1': [51.5579, 0.0683], 'IG2': [51.5762, 0.0683], 'IG3': [51.5794, 0.0904], 'IG4': [51.5794, 0.0448],
    'IG5': [51.5808, 0.0196], 'IG6': [51.6021, 0.0918], 'IG7': [51.6243, 0.0748], 'IG8': [51.6075, 0.0334],
    'IG11': [51.5397, 0.0812],
    'BR1': [51.4014, 0.0140], 'BR2': [51.3786, 0.0140], 'BR3': [51.4014, -0.0133], 'BR4': [51.3786, -0.0133],
    'BR5': [51.3786, 0.0706], 'BR6': [51.3571, 0.0706], 'BR7': [51.4014, 0.0706],
    'CR0': [51.3757, -0.0985], 'CR2': [51.3571, -0.0985], 'CR3': [51.3225, -0.0985], 'CR4': [51.4025, -0.1680],
    'CR5': [51.3225, -0.1323], 'CR6': [51.3225, -0.0651], 'CR7': [51.3933, -0.0985], 'CR8': [51.3571, -0.1323],
    'SM1': [51.3696, -0.1948], 'SM2': [51.3571, -0.1948], 'SM3': [51.3786, -0.2250], 'SM4': [51.3933, -0.1948],
    'SM5': [51.3571, -0.2250], 'SM6': [51.3571, -0.1680], 'SM7': [51.3225, -0.2250],
    'EN1': [51.6535, -0.0708], 'EN2': [51.6535, -0.1008], 'EN3': [51.6661, -0.0412], 'EN4': [51.6280, -0.1580],
    'EN5': [51.6501, -0.1941], 'EN6': [51.7049, -0.1580],
    'WD6': [51.6572, -0.2558], 'WD17': [51.6572, -0.4170], 'WD19': [51.6367, -0.3714], 'WD23': [51.6572, -0.3236],
    'DA1': [51.4440, 0.2236], 'DA5': [51.4310, 0.1480], 'DA6': [51.4440, 0.1480], 'DA7': [51.4440, 0.1716],
    'DA8': [51.4570, 0.1980], 'DA14': [51.4180, 0.1157], 'DA15': [51.4310, 0.1157], 'DA16': [51.4570, 0.1157],
    'DA17': [51.4700, 0.1480], 'DA18': [51.4830, 0.1480],
  }

  if (location) {
    const locU = location.trim().toUpperCase()
    // Try postcode lookup first
    if (POSTCODE_COORDS[locU]) {
      locationCoords = { lat: POSTCODE_COORDS[locU][0], lng: POSTCODE_COORDS[locU][1] }
    } else {
      // Fall back to Nominatim for area names
      try {
        const geo = await fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(location + ', London, UK') + '&format=json&limit=1&countrycodes=gb', {
          headers: { 'User-Agent': 'NestLondon/1.0' }
        })
        const geoData = await geo.json()
        if (geoData[0]) locationCoords = { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) }
      } catch {}
    }
  }


  // List of London boroughs (matched case-insensitively) — used to detect borough searches
  const LONDON_BOROUGHS = ['Barking and Dagenham','Barnet','Bexley','Brent','Bromley','Camden','City of London','Croydon','Ealing','Enfield','Greenwich','Hackney','Hammersmith and Fulham','Haringey','Harrow','Havering','Hillingdon','Hounslow','Islington','Kensington and Chelsea','Kingston upon Thames','Lambeth','Lewisham','Merton','Newham','Redbridge','Richmond upon Thames','Southwark','Sutton','Tower Hamlets','Waltham Forest','Wandsworth','Westminster']
  let boroughMatch: string | null = null
  let postcodeMatch: string | null = null
  if (location && !radius) {
    const loc = location.trim()
    // Borough name match (case-insensitive)
    const bm = LONDON_BOROUGHS.find(b => b.toLowerCase() === loc.toLowerCase())
    if (bm) {
      boroughMatch = bm
      query = query.eq('borough', bm)
    } else {
      // Postcode prefix match (e.g. SW1, NW1, E1)
      const isPostcode = /^[A-Z]{1,2}[0-9]{1,2}$/i.test(loc)
      if (isPostcode) {
        postcodeMatch = loc.toUpperCase()
        // For central London codes like SW1/EC1/WC1/W1, the postcode dataset uses
        // letter sub-districts (SW1A, SW1E, ...). Expand the query to match them.
        const subDistrictRegex = new RegExp('^' + postcodeMatch + '[A-Z]$')
        const expanded = LONDON_POSTCODE_DISTRICTS.filter(d => d === postcodeMatch || subDistrictRegex.test(d))
        if (expanded.length > 0) {
          query = query.in('postcode_district', expanded)
        } else {
          // Fallback to exact match (returns nothing if no listings match)
          query = query.eq('postcode_district', postcodeMatch)
        }
      }
      // Otherwise no DB filter — fallback to JS radius below
    }
  }
  if (minBeds) query = query.gte('bedrooms', minBeds)
  if (maxBeds) query = query.lte('bedrooms', maxBeds)
  if (minBaths) query = query.gte('bathrooms', minBaths)
  if (maxBaths) query = query.lte('bathrooms', maxBaths)
  if (minPrice) query = query.gte('price', minPrice)
  if (maxPrice) query = query.lte('price', maxPrice)
  if (propertyType) {
    let propTypes = propertyType.split(',').map(s => s.trim()).filter(Boolean)
    // Flat ↔ Apartment merge: when 'Flat' is selected, also match 'Apartment'
    if (propTypes.includes('Flat') && !propTypes.includes('Apartment')) {
      propTypes = [...propTypes, 'Apartment']
    }
    if (propTypes.length === 1) {
      query = query.ilike('property_type', '%' + propTypes[0] + '%')
    } else if (propTypes.length > 1) {
      const orClause = propTypes.map(p => `property_type.ilike.*${p}*`).join(',')
      query = query.or(orClause)
    }
  }
  if (furnished) query = query.ilike('furnished', '%' + furnished + '%')
  if (addedWithin) {
    const since = new Date(Date.now() - addedWithin * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('scraped_at', since)
  }

  const { data: listings, error } = await query
  if (error) console.error(error)

  const mustHaveFeatures = features.filter((f: string) => !f.startsWith('exclude:'))
  const excludeFeatures = features.filter((f: string) => f.startsWith('exclude:')).map((f: string) => f.replace('exclude:', ''))

  function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const filtered = (listings || []).filter((listing: any) => {
    // Radius filter — use explicit radius or default 1 mile for geocoded locations
    if (locationCoords && listing.latitude && listing.longitude) {
      const effectiveRadius = radius ?? 1
      const dist = haversineM(locationCoords.lat, locationCoords.lng, listing.latitude, listing.longitude)
      if (dist > effectiveRadius * 1609.34) return false
    }

    const desc = (listing.description || '').toLowerCase()
    const feats = JSON.stringify(listing.features || '').toLowerCase()
    const combined = desc + ' ' + feats

    // Floor layout filter
    if (floorLayout) {
      const descLower = (listing.description || '').toLowerCase()
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const layout = (rd?.letting_details?.Layout || '').toLowerCase()
      const combined = descLower + ' ' + layout
      if (floorLayout === 'Single level') {
        // Single level: must be flat/apartment/studio OR explicitly say 'single level', and must NOT mention multi-floor markers.
        const isSingle = /\bsingle[- ]?level\b/.test(combined) || /\b(flat|apartment|studio)\b/.test(combined)
        if (!isSingle) return false
        if (/split[- ]?level|over (?:two|three) floors|maisonette|duplex|two[- ]?storey|three[- ]?storey/.test(combined)) return false
      } else if (floorLayout === 'Split-level') {
        if (!/split[- ]?level/.test(combined)) return false
      } else if (floorLayout === 'Multiple floors') {
        if (!/multiple floors|over (?:two|three) floors|two[- ]?storey|three[- ]?storey|maisonette|duplex/.test(combined) && !/multiple floors/i.test(layout)) return false
      }
    }

    // Exclude listings with no floorplan
    if (excludeFeatures.includes('No floorplan')) {
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const fps = rd?.floorplans
      if (!Array.isArray(fps) || fps.length === 0) return false
    }

    // Size filter
    if (minSize || maxSize) {
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const sizeRaw = rd?.size_text || ''
      const sqftM = sizeRaw.match(/([\d,]+)\s*sq\s*ft/i) || desc.match(/([\d,]+)\s*sq\s*ft/i)
      const sqmM = sizeRaw.match(/([\d,]+)\s*sq\s*m(?!ft)/i) || desc.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
      let sqft: number | null = null
      if (sqftM) sqft = parseFloat(sqftM[1].replace(',', ''))
      else if (sqmM) sqft = Math.round(parseFloat(sqmM[1].replace(',', '')) * 10.764)
      if (!sqft) return false  // exclude listings with no size info when size filter is active
      if (minSize && sqft < minSize) return false
      if (maxSize && sqft > maxSize) return false
    if ((minPricePerSqm || maxPricePerSqm) && sqft && listing.price) {
      // values stored as per-sqm always (sqft options converted at filter time)
      const sqm = sqft / 10.764
      const ppsqm = listing.price / sqm
      if (minPricePerSqm && ppsqm < minPricePerSqm) return false
      if (maxPricePerSqm && ppsqm > maxPricePerSqm) return false
    }
    }

    // Available from filter — match 'available now/immediately' or no specific future date mentioned
    if (availableFrom) {
      const af = new Date(availableFrom)
      const today = new Date()
      const isNow = af <= today
      if (isNow) {
        // Looking for immediate availability
        if (!/available\s+now|available\s+immediately|available\s+from\s+(?:today|this week|asap)/i.test(combined)) return false
      } else {
        // Looking for available by a future date — match 'available now' or a date before/on availableFrom
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
        const afMonth = monthNames[af.getMonth()]
        const afYear = af.getFullYear()
        const hasNow = /available\s+now|available\s+immediately/i.test(combined)
        const hasFutureDate = new RegExp(afMonth + '[\s\S]{0,20}' + afYear, 'i').test(combined)
        if (!hasNow && !hasFutureDate) return false
      }
    }
    for (const f of mustHaveFeatures) {
      const fl = f.toLowerCase()
      if (fl === 'pets allowed') {
        if (!/\bpets?\b|pet friendly|pets considered|pets welcome|pets negotiable/.test(combined)) return false
      } else if (fl === 'garden') {
        if (!/\bgardens?\b/.test(combined) || /no garden|without garden/.test(combined)) return false
      } else if (fl === 'balcony') {
        if (!/\bbalcon(y|ies)\b/.test(combined)) return false
      } else if (fl === 'parking') {
        if (!/\bparking\b|\bgarage\b/.test(combined)) return false
      } else if (fl === 'bills included') {
        if (!/bills? included|bills? inc/.test(combined)) return false
      } else if (fl === 'lift') {
        // Require 'lift' to appear in key_features or photo_tags (structured signal),
        // OR phrased as 'lift access' / 'with lift' / 'building lift' in description
        const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
        const kf = (rd?.key_features || []).join(' ').toLowerCase()
        const pt = (rd?.photo_tags?.features || []).join(' ').toLowerCase()
        const hasInStructured = /\b(lift|elevator)\b/.test(kf) || /\b(lift|elevator)\b/.test(pt)
        const hasQualified = /\blift\s+access\b|\bwith\s+lift\b|\bbuilding\s+lift\b|\belevator\b/.test(combined)
        if (!hasInStructured && !hasQualified) return false
      } else if (fl === 'recently refurbished') {
        if (!/refurb|renovated|newly decorated|recently updated|modernised/.test(combined)) return false
      } else if (fl === 'new build') {
        if (!/new build|newly built|brand new/.test(combined)) return false
      } else {
        if (!combined.includes(fl)) return false
      }
    }
    for (const f of excludeFeatures) {
      if (f === 'New builds' && combined.includes('new build')) return false
      if (f === 'Shared ownership' && combined.includes('shared ownership')) return false
      if (f === 'Retirement homes' && combined.includes('retirement')) return false
      if (f === 'Lower ground floor' && /lower ground floor|lower ground level|basement/.test(combined)) return false
      if (f === 'Ground floor' && /ground floor flat|ground floor apartment|ground floor property/.test(combined)) return false
      if (f === 'Renovation needed' && /in need of renovation|needs renovation|requires renovation|needs updating|in need of updating|modernisation required|requires modernisation|project property|in need of some tlc|needs some tlc/.test(combined)) return false
    }
    // Style filter — match any selected style
    if (style) {
      const selectedStyles = style.split(',').map((s: string) => s.toLowerCase())
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const photoStyle = (rd?.photo_tags?.style || '').toLowerCase()
      if (!selectedStyles.some((s: string) => photoStyle.includes(s))) return false
    }
    // Tenure filter — match raw_data.letting_details.Tenure or description text
    if (tenure) {
      const tenures = tenure.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const ten = (rd?.letting_details?.Tenure || '').toLowerCase()
      const matchesAny = tenures.some((t: string) => {
        if (ten.includes(t)) return true
        // Description fallback: 'freehold' / 'leasehold' / 'share of freehold'
        if (combined.includes(t)) return true
        return false
      })
      if (!matchesAny) return false
    }

    // Chain free filter (sales)
    if (chainFree) {
      if (!/chain[- ]free|no onward chain|no upward chain/i.test(combined)) return false
    }

    // New build filter — match feature, description, or raw_data
    if (newBuild) {
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const featuresStr = JSON.stringify(rd?.key_features || []).toLowerCase()
      if (!/new build|newly built|brand new|new home|recently built/.test(combined) && !featuresStr.includes('new build')) return false
    }

    // Leasehold minimum years filter — extract years from description and check
    if (leaseholdMin) {
      const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
      const leaseStr = (rd?.letting_details?.Lease || rd?.letting_details?.['Lease length'] || '').toLowerCase()
      const searchText = leaseStr + ' ' + combined
      const m = searchText.match(/(\d{2,3})\s*year(?:s)?\s*(?:lease|remaining)?/)
      if (!m) return false  // no lease info — exclude
      const years = parseInt(m[1])
      if (years < leaseholdMin) return false
    }

    // addedWithin filter in JS too (handles fractional days for hours)
    if (addedWithin) {
      const since = new Date(Date.now() - addedWithin * 24 * 60 * 60 * 1000)
      const scrapedAt = listing.scraped_at ? new Date(listing.scraped_at) : null
      if (!scrapedAt || scrapedAt < since) return false
    }

    return true
  })

  const allListingsForMap = listings

  // Default centre to Mayfair when no location set but radius is requested
  if (!locationCoords && radius) locationCoords = { lat: 51.5074, lng: -0.1428 }

  // Fetch all listings with coords for nearby section (unfiltered by location)
  let allListingsNearby: any[] = []
  if (locationCoords) {
    const { data: nearbyAll } = await supabase
      .from('listings')
      .select('id,address,price,images,bedrooms,bathrooms,property_type,latitude,longitude,description,raw_data')
      .eq('is_active', true)
      .is('canonical_listing_id', null)
      .eq('listing_type', listingType)
      .not('latitude', 'is', null)
      .limit(500)
    allListingsNearby = nearbyAll || []
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB]">
      <nav className="border-b border-[#1C2B3A]/10 bg-white relative z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <Link href="/" className="text-xl font-light text-[#1C2B3A] flex-shrink-0 no-underline" style={{fontFamily:'Georgia,serif'}}>
            nest<span className="text-orange-700 italic">london</span>
          </Link>
          <Link href="/list" className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0 no-underline">List your property</Link>
          <Link href="/boroughs" className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0 no-underline">Borough guides</Link>
          <div className="flex items-center flex-1">
            <NavSearchBar
              location={location}
              listingType={listingType}
              minBeds={minBeds}
              maxBeds={maxBeds}
              minPrice={minPrice}
              maxPrice={maxPrice}
              radius={radius}
              furnished={furnished}
              propertyType={propertyType}
              features={features}
              addedWithin={addedWithin}
              availableFrom={availableFrom}
              style={style}
              tenure={tenure}
              chainFree={chainFree}
              newBuild={newBuild}
              leaseholdMin={leaseholdMin}
              minBaths={minBaths}
              maxBaths={maxBaths}
              maxPricePerSqm={maxPricePerSqm}
              minPricePerSqm={minPricePerSqm}
              commuteLocations={commuteLocations}
            />
          </div>
          <NavAuthButton variant="light" />
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-6">
        {<SearchResults filtered={filtered} allListings={allListingsNearby.length > 0 ? allListingsNearby : (listings || [])} allListingsForMap={allListingsForMap || []} radius={radius} locationCoords={locationCoords} location={location} boroughMatch={boroughMatch} postcodeMatch={postcodeMatch} minBeds={minBeds} maxBeds={maxBeds} minPrice={minPrice} maxPrice={maxPrice} commuteLocations={commuteLocations} listingType={listingType} />
        }
      </div>
    </main>
  )
}
