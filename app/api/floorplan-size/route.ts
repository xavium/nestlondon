import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { floorplanUrl, listingId } = await req.json()
    if (!floorplanUrl) return NextResponse.json({ size: null })

    const supabase = listingId ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) : null

    // Cache check — if we've already extracted size for this listing, return it without an API call
    if (supabase && listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('raw_data')
        .eq('id', listingId)
        .single()
      if (listing) {
        const raw = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
        if (raw.size_from_floorplan) {
          return NextResponse.json({ size: raw.size_from_floorplan, cached: true })
        }
      }
    }

    // Fetch the floorplan image
    const imgRes = await fetch(floorplanUrl, {
      headers: { 'Referer': 'https://www.rightmove.co.uk/' }
    })
    if (!imgRes.ok) return NextResponse.json({ size: null })

    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 }
            },
            {
              type: 'text',
              text: 'Look at this floorplan. Find the total floor area. Reply with ONLY a whole number (no decimals) followed by "sq ft" or "sq m" — no period after sq. Examples: "750 sq ft" or "70 sq m". If no area is shown, reply with exactly "none".'
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || 'none'
    if (text === 'none' || text.toLowerCase().includes('none')) {
      // Cache the negative result too so we don't keep retrying floorplans without sizes
      if (supabase && listingId) {
        const { data: listing } = await supabase
          .from('listings')
          .select('raw_data')
          .eq('id', listingId)
          .single()
        if (listing) {
          const raw = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
          raw.size_from_floorplan = 'none'
          await supabase.from('listings').update({ raw_data: raw }).eq('id', listingId)
        }
      }
      return NextResponse.json({ size: null })
    }

    // Cache successful result
    if (supabase && listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('raw_data')
        .eq('id', listingId)
        .single()
      if (listing) {
        const raw = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
        raw.size_from_floorplan = text
        await supabase.from('listings').update({ raw_data: raw }).eq('id', listingId)
      }
    }

    return NextResponse.json({ size: text })

  } catch (error) {
    console.error('Floorplan OCR error:', error)
    return NextResponse.json({ size: null })
  }
}
