import { NextRequest, NextResponse } from 'next/server'
import { parseListingImages } from '@/lib/listingImages'
import { createClient } from '@supabase/supabase-js'

const TAGS_PROMPT = `Analyse this property photo and return a JSON object with these fields:

style: one of ["Modern", "Contemporary", "Victorian", "Georgian", "Edwardian", "Art Deco", "Industrial", "Minimalist", "Traditional", "Period", "New build", "Converted", "Loft"] or null
condition: one of ["Excellent", "Good", "Fair", "Needs work"] or null  
features: array of tags from ["High ceilings", "Period features", "Exposed brick", "Exposed beams", "Sash windows", "Bay windows", "Parquet flooring", "Wooden floors", "Marble", "Open plan", "Mezzanine", "Skylight", "Balcony visible", "Garden visible", "City views", "Fireplace", "Underfloor heating visible", "Smart home", "Gym", "Concierge visible"] — only include what is clearly visible
room: one of ["Living room", "Kitchen", "Bedroom", "Bathroom", "Hallway", "Garden", "Balcony", "Exterior", "Other"] or null

Return ONLY valid JSON, no explanation. Example:
{"style":"Victorian","condition":"Excellent","features":["High ceilings","Sash windows","Period features","Wooden floors"],"room":"Living room"}`

export async function POST(req: NextRequest) {
  try {
    const { listing_id, image_url, save = true } = await req.json()

    if (!image_url) return NextResponse.json({ error: 'image_url required' }, { status: 400 })

    // Call Claude vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: image_url } },
            { type: 'text', text: TAGS_PROMPT }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'

    let tags: any = {}
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      tags = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse tags', raw: text }, { status: 500 })
    }

    // Save tags to listing raw_data if requested
    if (save && listing_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: listing } = await supabase
        .from('listings')
        .select('raw_data')
        .eq('id', listing_id)
        .maybeSingle()

      if (listing) {
        const raw = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
        const existingTags = raw.photo_tags || {}
        const mergedFeatures = [...new Set([...(existingTags.features || []), ...(tags.features || [])])]
        const merged = {
          style: tags.style || existingTags.style,
          condition: tags.condition || existingTags.condition,
          features: mergedFeatures,
        }
        raw.photo_tags = merged
        await supabase.from('listings').update({ raw_data: raw }).eq('id', listing_id)
      }
    }

    return NextResponse.json({ tags })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — analyse all images for a listing and aggregate tags
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const listing_id = searchParams.get('listing_id')
    if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: listing } = await supabase
      .from('listings')
      .select('images, raw_data')
      .eq('id', listing_id)
      .maybeSingle()

    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Return cached tags if already analysed
    const raw = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data) : (listing.raw_data || {})
    if (raw.photo_tags?.style || raw.photo_tags?.features?.length > 0) {
      return NextResponse.json({ tags: raw.photo_tags, cached: true })
    }

    // Analyse first 3 images
    const images = parseListingImages(listing.images)
    const toAnalyse = images.slice(0, 3)

    if (toAnalyse.length === 0) return NextResponse.json({ tags: null })

    const allTags: any[] = []
    for (const url of toAnalyse) {
      try {
        const res = await fetch(new URL(req.url).origin + '/api/listing-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id, image_url: url, save: false })
        })
        const d = await res.json()
        if (d.tags) allTags.push(d.tags)
      } catch {}
    }

    if (allTags.length === 0) return NextResponse.json({ tags: null })

    // Aggregate — use most common style, best condition, union of features
    const styles = allTags.map(t => t.style).filter(Boolean)
    const style = styles.length > 0 ? styles.sort((a, b) =>
      styles.filter(v => v === b).length - styles.filter(v => v === a).length
    )[0] : null

    const conditions = allTags.map(t => t.condition).filter(Boolean)
    const conditionOrder = ['Excellent', 'Good', 'Fair', 'Needs work']
    const condition = conditions.length > 0
      ? conditions.sort((a, b) => conditionOrder.indexOf(a) - conditionOrder.indexOf(b))[0]
      : null

    const features = [...new Set(allTags.flatMap(t => t.features || []))]

    const aggregated = { style, condition, features }

    // Save to raw_data
    raw.photo_tags = aggregated
    await supabase.from('listings').update({ raw_data: raw }).eq('id', listing_id)

    return NextResponse.json({ tags: aggregated, cached: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
