import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { floorplanUrl } = await req.json()
    if (!floorplanUrl) return NextResponse.json({ size: null })

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
      return NextResponse.json({ size: null })
    }
    return NextResponse.json({ size: text })

  } catch (error) {
    console.error('Floorplan OCR error:', error)
    return NextResponse.json({ size: null })
  }
}
