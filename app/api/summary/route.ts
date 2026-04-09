import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { description, address, price, bedrooms, bathrooms, propertyType, furnished, source } = await req.json()

    if (!description) {
      return NextResponse.json({ error: 'No description' }, { status: 400 })
    }

    const prompt = 'You are a property analyst summarising London rental listings for prospective tenants. Be honest, direct and factual.\n\nProperty details:\n- Address: ' + address + '\n- Price: £' + price + '/month\n- Type: ' + (propertyType || 'unknown') + ', ' + (bedrooms || '?') + ' bed, ' + (bathrooms || '?') + ' bath\n- Furnished: ' + (furnished || 'not specified') + '\n\nAgent description:\n' + description + '\n\nWrite a tenant-focused summary with these sections:\n\nOVERVIEW\nOne sentence: what it is, key feature, location context.\n\nKEY FACTS\n3-5 bullet points of facts explicitly mentioned (floor, size, transport, features, condition).\n\nHONEST TAKE\nOne sentence on value and any red flags or standout positives.\n\nKeep total under 180 words. Never invent facts not in the description.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    console.log('Anthropic response:', JSON.stringify(data).slice(0, 500))

    if (data.error) {
      console.error('Anthropic error:', data.error)
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    const text = data.content?.[0]?.text || null
    return NextResponse.json({ summary: text })

  } catch (error) {
    console.error('Summary error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
