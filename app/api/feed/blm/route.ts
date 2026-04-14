import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// BLM (Branch/Listing/Media) feed parser
// Industry standard format used by Rightmove, Zoopla and all major UK letting agent CRMs
// Spec: https://webservices.rightmove.co.uk/docs/BLM_Specification.pdf

interface BLMProperty {
  AGENT_REF?: string
  DISPLAY_ADDRESS?: string
  ADDRESS_1?: string
  ADDRESS_2?: string
  TOWN?: string
  POSTCODE1?: string
  POSTCODE2?: string
  PRICE?: string
  PRICE_QUALIFIER?: string
  PROP_TYPE?: string
  BEDROOMS?: string
  BATHROOMS?: string
  RECEPTION_ROOMS?: string
  DESCRIPTION?: string
  FEATURE1?: string
  FEATURE2?: string
  FEATURE3?: string
  FEATURE4?: string
  FEATURE5?: string
  FEATURE6?: string
  FEATURE7?: string
  FEATURE8?: string
  FEATURE9?: string
  FEATURE10?: string
  MEDIA_IMAGE_00?: string
  MEDIA_IMAGE_01?: string
  MEDIA_IMAGE_02?: string
  MEDIA_IMAGE_03?: string
  MEDIA_IMAGE_04?: string
  MEDIA_IMAGE_05?: string
  MEDIA_IMAGE_06?: string
  MEDIA_IMAGE_07?: string
  MEDIA_IMAGE_08?: string
  MEDIA_IMAGE_09?: string
  MEDIA_IMAGE_10?: string
  MEDIA_IMAGE_11?: string
  MEDIA_IMAGE_12?: string
  MEDIA_IMAGE_13?: string
  MEDIA_IMAGE_14?: string
  MEDIA_IMAGE_15?: string
  LATITUDE?: string
  LONGITUDE?: string
  LET_TYPE?: string
  LET_FURN_TYPE?: string
  LET_RENT_FREQUENCY?: string
  AVAILABLE_DATE?: string
  MINIMUM_TERM?: string
  STATUS?: string
  PUBLISHED_FLAG?: string
  FLOOR_AREA?: string
  FLOOR_AREA_UNITS?: string
  BRANCH_ID?: string
  CREATE_DATE?: string
  UPDATE_DATE?: string
  [key: string]: string | undefined
}

interface BLMSection {
  type: string
  fields: Record<string, string>
}

function parseBLM(content: string): { header: Record<string,string>, properties: BLMProperty[], agent: Record<string,string> } {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  
  let header: Record<string,string> = {}
  let agent: Record<string,string> = {}
  const properties: BLMProperty[] = []
  
  let currentSection: string | null = null
  let currentFields: Record<string,string> = {}
  let delimiter = '|'
  let eofMarker = 'EOF'
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Section markers
    if (trimmed === '#HEADER#') { currentSection = 'HEADER'; currentFields = {}; continue }
    if (trimmed === '#AGENT#') { currentSection = 'AGENT'; currentFields = {}; continue }
    if (trimmed === '#PROPERTY#') { currentSection = 'PROPERTY'; currentFields = {}; continue }
    if (trimmed === '#END#') {
      if (currentSection === 'HEADER') {
        header = { ...currentFields }
        delimiter = header.DELIMITER || '|'
        eofMarker = header.EOF || 'EOF'
      } else if (currentSection === 'AGENT') {
        agent = { ...currentFields }
      } else if (currentSection === 'PROPERTY') {
        if (currentFields.AGENT_REF || currentFields.DISPLAY_ADDRESS) {
          properties.push({ ...currentFields } as BLMProperty)
        }
      }
      currentSection = null
      currentFields = {}
      continue
    }
    
    // Parse field=value pairs
    if (currentSection) {
      const sepIdx = trimmed.indexOf(delimiter)
      if (sepIdx > 0) {
        const key = trimmed.substring(0, sepIdx).trim()
        const value = trimmed.substring(sepIdx + 1).trim()
        currentFields[key] = value
      }
    }
  }
  
  return { header, properties, agent }
}

function normaliseAddress(address: string): string {
  return address.toLowerCase()
    .replace(/\bflat\s+[\w/]+,?\s*/g, '')
    .replace(/\bapartment\s+[\w/]+,?\s*/g, '')
    .replace(/,?\s*london\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeFingerprint(address: string, bedrooms: number | null, price: number | null): string {
  const key = normaliseAddress(address) + '|' + (bedrooms || 0) + '|' + (price || 0)
  return crypto.createHash('md5').update(key).digest('hex')
}

function parseFurnished(letFurnType?: string): string | null {
  if (!letFurnType) return null
  const n = parseInt(letFurnType)
  // BLM furnished codes: 0=furnished, 1=part-furnished, 2=unfurnished, 3=not specified
  if (n === 0) return 'Furnished'
  if (n === 1) return 'Part furnished'
  if (n === 2) return 'Unfurnished'
  return null
}

function parsePropertyType(propType?: string): string | null {
  const types: Record<string, string> = {
    '0': 'Not specified', '1': 'Terraced', '2': 'End of terrace',
    '3': 'Semi-detached', '4': 'Detached', '5': 'Mews',
    '6': 'Cluster house', '7': 'Ground flat', '8': 'Flat',
    '9': 'Studio', '10': 'Ground maisonette', '11': 'Maisonette',
    '12': 'Bungalow', '13': 'Detached bungalow', '14': 'Semi-detached bungalow',
    '15': 'Retirement property', '16': 'Block of apartments',
    '17': 'Converted flat', '18': 'Property', '20': 'House',
  }
  return types[propType || ''] || propType || null
}

function parsePriceToMonthly(price: string, frequency?: string): number | null {
  const p = parseInt(price.replace(/[^0-9]/g, ''))
  if (!p) return null
  // BLM frequency: 1=weekly, 2=monthly, 4=annually
  const freq = frequency || '2'
  if (freq === '1') return Math.round(p * 52 / 12)  // weekly to monthly
  if (freq === '4') return Math.round(p / 12)         // annual to monthly
  return p  // monthly
}

function parseDate(dateStr?: string): string | null {
  if (!dateStr) return null
  // BLM dates: DD/MM/YYYY or YYYY-MM-DD
  try {
    const m1 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m1) return m1[3] + '-' + m1[2] + '-' + m1[1]
    const m2 = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m2) return m2[0]
  } catch {}
  return null
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate — agents must provide their API key in the header
    const agentKey = req.headers.get('x-agent-key') || req.headers.get('authorization')?.replace('Bearer ', '')
    if (!agentKey) {
      return NextResponse.json({ error: 'Missing x-agent-key header' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up agent by API key
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, email')
      .eq('api_key', agentKey)
      .eq('is_active', true)
      .maybeSingle()

    if (!agent) {
      return NextResponse.json({ error: 'Invalid or inactive agent key' }, { status: 401 })
    }

    // Parse the BLM content
    const contentType = req.headers.get('content-type') || ''
    let blmContent: string

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      blmContent = await file.text()
    } else {
      blmContent = await req.text()
    }

    if (!blmContent?.trim()) {
      return NextResponse.json({ error: 'Empty BLM content' }, { status: 400 })
    }

    const { properties } = parseBLM(blmContent)

    if (properties.length === 0) {
      return NextResponse.json({ error: 'No properties found in BLM feed' }, { status: 400 })
    }

    let saved = 0, updated = 0, deactivated = 0
    const newIds: string[] = []
    const processedRefs = new Set<string>()

    for (const prop of properties) {
      try {
        // Skip unpublished listings
        const published = prop.PUBLISHED_FLAG
        if (published === '0') continue

        const agentRef = prop.AGENT_REF || ''
        processedRefs.add(agentRef)

        // Build address
        // Use DISPLAY_ADDRESS if available, otherwise build from parts
        let address: string
        const postcode = [prop.POSTCODE1, prop.POSTCODE2].filter(Boolean).join(' ').trim() || null
        if (prop.DISPLAY_ADDRESS) {
          address = prop.DISPLAY_ADDRESS
          if (postcode && !address.includes(postcode)) address += ', ' + postcode
        } else {
          const addressParts = [prop.ADDRESS_1, prop.ADDRESS_2, prop.TOWN].filter(Boolean)
          if (postcode) addressParts.push(postcode)
          address = addressParts.join(', ')
        }
        if (!address) continue

        // Parse numeric fields
        const price = parsePriceToMonthly(prop.PRICE || '0', prop.LET_RENT_FREQUENCY)
        const bedrooms = prop.BEDROOMS ? parseInt(prop.BEDROOMS) : null
        const bathrooms = prop.BATHROOMS ? parseInt(prop.BATHROOMS) : null
        const fp = makeFingerprint(address, bedrooms, price)

        // Collect images
        const images: string[] = []
        for (let i = 0; i <= 15; i++) {
          const key = 'MEDIA_IMAGE_' + String(i).padStart(2, '0') as keyof BLMProperty
          const url = prop[key]
          if (url && url.startsWith('http')) images.push(url)
        }

        // Collect key features
        const features: string[] = []
        for (let i = 1; i <= 10; i++) {
          const f = prop['FEATURE' + i]
          if (f) features.push(f)
        }

        // Floor area
        let squareFeet: number | null = null
        if (prop.FLOOR_AREA) {
          const area = parseFloat(prop.FLOOR_AREA)
          if (area > 0) {
            squareFeet = prop.FLOOR_AREA_UNITS === '1' ? Math.round(area * 10.764) : Math.round(area)
          }
        }

        const availableFrom = parseDate(prop.AVAILABLE_DATE)
        const listedAt = parseDate(prop.CREATE_DATE) || new Date().toISOString().split('T')[0]

        const record = {
          agent_id: agent.id,
          source: agent.name,
          source_id: agent.id + '_' + agentRef,
          fingerprint: fp,
          address,
          postcode,
          price,
          price_period: 'month',
          bedrooms,
          bathrooms,
          square_feet: squareFeet,
          property_type: parsePropertyType(prop.PROP_TYPE),
          listing_type: 'rent',
          description: prop.DESCRIPTION || null,
          images: JSON.stringify(images),
          features: JSON.stringify(features),
          furnished: parseFurnished(prop.LET_FURN_TYPE),
          latitude: prop.LATITUDE ? parseFloat(prop.LATITUDE) : null,
          longitude: prop.LONGITUDE ? parseFloat(prop.LONGITUDE) : null,
          available_from: availableFrom,
          listed_at: listedAt,
          is_active: true,
          is_direct: true,
          scraped_at: new Date().toISOString(),
          raw_data: JSON.stringify({ key_features: features, letting_details: { 'Let type': prop.LET_TYPE, 'Minimum term': prop.MINIMUM_TERM }, blm_ref: agentRef }),
        }

        // Check if listing already exists for this agent+ref
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_id', record.source_id)
          .maybeSingle()

        if (existing) {
          await supabase.from('listings').update(record).eq('id', existing.id)
          updated++
        } else {
          const { data: inserted } = await supabase.from('listings').insert(record).select('id').single()
          if (inserted) newIds.push(inserted.id)
          saved++
        }
      } catch (e: any) {
        console.error('[BLM] Property error:', e.message)
      }
    }

    // Deactivate listings not in this feed (agent removed them)
    const { data: agentListings } = await supabase
      .from('listings')
      .select('id, source_id')
      .eq('agent_id', agent.id)
      .eq('is_active', true)

    for (const l of agentListings || []) {
      const ref = l.source_id?.replace(agent.id + '_', '')
      if (ref && !processedRefs.has(ref)) {
        await supabase.from('listings').update({ is_active: false }).eq('id', l.id)
        deactivated++
      }
    }

    // Trigger property alerts for new listings
    if (newIds.length > 0 && process.env.ALERTS_SECRET) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      fetch(siteUrl + '/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.ALERTS_SECRET, listing_ids: newIds }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      processed: properties.length,
      saved,
      updated,
      deactivated,
      message: 'Feed processed successfully',
    })
  } catch (e: any) {
    console.error('[BLM] Feed error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — test endpoint to verify agent key is working
export async function GET(req: NextRequest) {
  const agentKey = req.headers.get('x-agent-key') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!agentKey) return NextResponse.json({ error: 'Missing x-agent-key header' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, email')
    .eq('api_key', agentKey)
    .eq('is_active', true)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 })

  return NextResponse.json({
    success: true,
    agent: agent.name,
    endpoint: 'POST /api/feed/blm',
    instructions: 'POST your BLM file to this endpoint with Content-Type: text/plain or multipart/form-data with field name "file". Include your agent key in the x-agent-key header.',
  })
}
