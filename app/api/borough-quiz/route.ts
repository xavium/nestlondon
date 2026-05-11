import { NextRequest, NextResponse } from 'next/server'

const BOROUGHS = 'City of London, Westminster, Camden, Islington, Hackney, Tower Hamlets, Southwark, Lambeth, Wandsworth, Kensington and Chelsea, Hammersmith and Fulham, Ealing, Brent, Greenwich, Lewisham, Bromley, Croydon, Merton, Richmond upon Thames, Kingston upon Thames, Hounslow, Haringey, Enfield, Waltham Forest, Redbridge, Newham, Barking and Dagenham, Havering, Bexley, Sutton, Barnet, Harrow'

function fmtRent(v: number): string {
  return '£' + v.toLocaleString() + '/mo'
}

export async function POST(req: NextRequest) {
  try {
    const { answers, rent } = await req.json()
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    const priorities = Array.isArray(answers.priorities) ? answers.priorities.join(', ') : 'none specified'
    const rentVal = typeof rent === 'number' ? rent : 2000
    const safeRent = Math.max(500, Math.min(rentVal, 20000))  // clamp to sensible range

    const prompt = `You are a London property expert helping someone find their ideal borough to rent in.

Based on this person\'s preferences, recommend exactly 3 London boroughs. Return ONLY valid JSON, no markdown, no explanation.

Preferences:
- Lifestyle priorities: ${priorities}
- Transport preference: ${answers.transport || 'not specified'}
- Neighbourhood vibe: ${answers.vibe || 'not specified'}
- Renting with: ${answers.who || 'not specified'}
- Commute destination: ${answers.commute || 'not specified'}
- Max commute time: ${answers.commuteTime || 'not specified'}
- Life stage: ${answers.lifeStage || 'not specified'}
- Must-haves: ${answers.extra || 'none'}
- Max monthly rent: ${fmtRent(safeRent)}

Return this exact JSON shape:
{
  "boroughs": [
    {
      "name": "Borough name",
      "matchPercent": 94,
      "tags": ["tag1","tag2","tag3"],
      "bullets": ["Positive reason 1","Positive reason 2","Positive reason 3"],
      "avgRent": "£1,800–£2,400/mo",
      "searchSlug": "hackney"
    }
  ]
}

Rules:
- You MUST choose from these 32 London boroughs only: ${BOROUGHS}
- Do NOT return neighborhoods (e.g. use "Lambeth" not "Brixton", "Hackney" not "Shoreditch", "Camden" not "Hampstead")
- name: exact borough name from the list above, matching capitalisation
- matchPercent: integer 75-98, highest first
- tags: 3 short vibe tags (e.g. "Young crowd", "Cafe culture", "Great transport")
- bullets: 3 specific, warm, positive reasons this borough suits them
- searchSlug: lowercase borough name for URL (e.g. "hammersmith-and-fulham")
- Only recommend boroughs where average rents are achievable within their budget
- If a commute destination is given, prioritise boroughs with good transport links to that destination within the stated commute time
- If the person is a student, factor in proximity to universities, student-friendly amenities, and affordable areas
- Tailor the bullet points to reflect their life stage naturally`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }
    const text = (data.content || []).map((b: { text?: string }) => b.text || '').join('')
    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
