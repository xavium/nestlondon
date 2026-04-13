import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const HAVERSINE_M = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const POSTCODE_COORDS: Record<string, [number,number]> = {
  'EC1':[51.5223,-0.0988],'EC2':[51.5178,-0.0823],'WC1':[51.5228,-0.1212],'WC2':[51.5121,-0.1228],
  'E1':[51.5154,-0.0708],'E2':[51.5277,-0.0549],'E8':[51.5415,-0.0594],'E14':[51.5051,-0.0209],
  'N1':[51.5362,-0.1033],'N16':[51.5635,-0.0740],
  'NW1':[51.5308,-0.1238],'NW3':[51.5503,-0.1643],'NW6':[51.5466,-0.2041],
  'SE1':[51.5044,-0.1052],'SE5':[51.4697,-0.0694],'SE15':[51.4697,-0.0694],'SE22':[51.4571,-0.0533],
  'SW4':[51.4618,-0.1386],'SW6':[51.4753,-0.2010],'SW9':[51.4723,-0.1228],'SW11':[51.4647,-0.1607],
  'W1':[51.5152,-0.1415],'W2':[51.5154,-0.1755],'W11':[51.5094,-0.1967],
}

function matchesSearch(listing: any, params: Record<string,string>): boolean {
  if (params.minBeds && listing.bedrooms !== null && listing.bedrooms < parseInt(params.minBeds)) return false
  if (params.maxBeds && listing.bedrooms !== null && listing.bedrooms > parseInt(params.maxBeds)) return false
  if (params.minPrice && listing.price < parseInt(params.minPrice)) return false
  if (params.maxPrice && listing.price > parseInt(params.maxPrice)) return false
  if (params.propertyType && !listing.property_type?.toLowerCase().includes(params.propertyType.toLowerCase())) return false
  if (params.furnished && !listing.furnished?.toLowerCase().includes(params.furnished.toLowerCase())) return false
  if (params.location && listing.latitude && listing.longitude) {
    const coords = POSTCODE_COORDS[params.location.trim().toUpperCase()]
    if (coords) {
      const dist = HAVERSINE_M(coords[0], coords[1], listing.latitude, listing.longitude)
      if (dist > (params.radius ? parseFloat(params.radius) : 1) * 1609.34) return false
    }
  }
  return true
}

function describeSearch(params: Record<string,string>): string {
  const parts: string[] = []
  if (params.location) parts.push(params.location)
  if (params.minBeds) parts.push((params.minBeds === '0' ? 'Studio' : params.minBeds + ' bed') + ' min')
  if (params.maxPrice) parts.push('up to £' + parseInt(params.maxPrice).toLocaleString())
  return parts.join(' · ') || 'All London rentals'
}

export async function POST(req: NextRequest) {
  const { secret, listing_ids } = await req.json().catch(() => ({}))
  if (secret !== (process.env.ALERTS_SECRET || 'nestlondon-alerts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  let newListings: any[] = []
  if (listing_ids?.length) {
    const { data } = await supabase.from('listings').select('*').in('id', listing_ids).eq('is_active', true)
    newListings = data || []
  } else {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('listings').select('*').eq('is_active', true).gte('scraped_at', since)
    newListings = data || []
  }

  if (newListings.length === 0) return NextResponse.json({ sent: 0, listings_checked: 0, message: 'No new listings' })

  const { data: savedSearches } = await supabase
    .from('saved_searches')
    .select('id, params, name, user_id, users ( email, name )')
    .eq('alerts_enabled', true)

  if (!savedSearches?.length) return NextResponse.json({ sent: 0, listings_checked: newListings.length, searches_checked: 0 })

  let emailsSent = 0
  const now = new Date().toISOString()
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  for (const search of savedSearches) {
    const user = (search as any).users
    if (!user?.email) continue

    const matches = newListings.filter(l => matchesSearch(l, search.params as Record<string,string>))
    if (matches.length === 0) continue

    const desc = describeSearch(search.params as Record<string,string>)
    const searchUrl = base + '/search?' + new URLSearchParams(search.params as Record<string,string>).toString()

    const listingLines = matches.slice(0, 5).map((l: any) => {
      const beds = l.bedrooms === 0 ? 'Studio' : l.bedrooms ? `${l.bedrooms} bed` : ''
      return `• ${l.address}\n  £${l.price?.toLocaleString()}/mo · ${beds}${l.property_type ? ' ' + l.property_type : ''}\n  ${base}/listings/${l.id}`
    }).join('\n\n')

    const emailBody = [
      `Hi ${user.name || 'there'},`,
      ``,
      `${matches.length} new ${matches.length === 1 ? 'property matches' : 'properties match'} your saved search "${search.name || desc}":`,
      ``,
      listingLines,
      matches.length > 5 ? `\n...and ${matches.length - 5} more. See all: ${searchUrl}` : `\nSee all: ${searchUrl}`,
      ``,
      `Manage alerts: ${base}/account?tab=searches`,
      `— NestLondon`,
    ].join('\n')

    if (process.env.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NestLondon Alerts <onboarding@resend.dev>',
          to: user.email,
          subject: `${matches.length} new ${matches.length === 1 ? 'property' : 'properties'} for ${desc}`,
          text: emailBody,
        }),
      })
      if (res.ok) {
        emailsSent++
        await supabase.from('saved_searches').update({ last_alerted_at: now }).eq('id', search.id)
      } else {
        console.error('[ALERTS] Resend error:', await res.text())
      }
    } else {
      console.log(`[ALERTS] Would email ${user.email}:\n${emailBody}`)
      emailsSent++
    }
  }

  return NextResponse.json({ sent: emailsSent, listings_checked: newListings.length, searches_checked: savedSearches.length })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  return POST(new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ secret: searchParams.get('secret') }),
    headers: { 'Content-Type': 'application/json' },
  }))
}
