import { NextRequest, NextResponse } from 'next/server'

const BOROUGHS = 'City of London, Westminster, Camden, Islington, Hackney, Tower Hamlets, Southwark, Lambeth, Wandsworth, Kensington and Chelsea, Hammersmith and Fulham, Ealing, Brent, Greenwich, Lewisham, Bromley, Croydon, Merton, Richmond upon Thames, Kingston upon Thames, Hounslow, Haringey, Enfield, Waltham Forest, Redbridge, Newham, Barking and Dagenham, Havering, Bexley, Sutton, Barnet, Harrow'

// Format the user's budget for display in the prompt. The AI sees the same string the user saw.
function fmtBudget(v: number, intent: 'rent' | 'buy'): string {
  if (intent === 'rent') return '£' + v.toLocaleString() + '/mo'
  if (v >= 1_000_000) return '£' + (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'm'
  return '£' + Math.round(v / 1000) + 'k'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { answers } = body
    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    // Intent drives most of the prompt. Default to 'rent' if missing (back-compat with any caller
    // still using the old shape, though the only caller is BoroughQuiz which now always sends intent).
    const intent: 'rent' | 'buy' = body.intent === 'buy' ? 'buy' : 'rent'

    // Budget: clamped to a sensible per-intent range. The frontend sliders cap at the same bounds.
    const rawBudget = typeof body.budget === 'number' ? body.budget : (intent === 'buy' ? 500_000 : 2000)
    const budget = intent === 'buy'
      ? Math.max(100_000, Math.min(rawBudget, 10_000_000))
      : Math.max(400, Math.min(rawBudget, 20_000))

    const priorities = Array.isArray(answers.priorities) ? answers.priorities.join(', ') : 'none specified'

    // Per-intent vocabulary, so the prompt reads naturally and the affordability rule references the right axis.
    const flavour = intent === 'buy'
      ? {
          verb: 'buy in',
          relationship: 'buying',
          budgetLabel: 'Max purchase price',
          affordability: 'Only recommend boroughs where typical sale prices for the kind of property they\'re likely to want are achievable within their purchase budget. Avoid prime central boroughs unless their budget genuinely supports them.',
          avgPriceLabel: 'avgPrice',
          avgPriceFormat: 'a sale price range like "£500k–£700k" or "£1.2m–£1.8m" reflecting typical 2-bed values in that borough',
        }
      : {
          verb: 'rent in',
          relationship: 'renting',
          budgetLabel: 'Max monthly rent',
          affordability: 'Only recommend boroughs where average monthly rents for the kind of property they\'re likely to want are achievable within their budget.',
          avgPriceLabel: 'avgPrice',
          avgPriceFormat: 'a monthly rent range like "£1,800–£2,400/mo" reflecting typical 2-bed values in that borough',
        }

    const prompt = `You are a London property expert helping someone find their ideal borough to ${flavour.verb}.

Based on this person\'s preferences, recommend exactly 3 London boroughs. Return ONLY valid JSON, no markdown, no explanation.

Preferences:
- Lifestyle priorities: ${priorities}
- Transport preference: ${answers.transport || 'not specified'}
- Neighbourhood vibe: ${answers.vibe || 'not specified'}
- Household: ${answers.who || 'not specified'}
- Commute destination: ${answers.commute || 'not specified'}
- Max commute time: ${answers.commuteTime || 'not specified'}
- Life stage: ${answers.lifeStage || 'not specified'}
- Must-haves: ${answers.extra || 'none'}
- ${flavour.budgetLabel}: ${fmtBudget(budget, intent)}
- They are ${flavour.relationship}, not ${intent === 'buy' ? 'renting' : 'buying'}.

Return this exact JSON shape:
{
  "boroughs": [
    {
      "name": "Borough name",
      "matchPercent": 94,
      "tags": ["tag1","tag2","tag3"],
      "bullets": ["Positive reason 1","Positive reason 2","Positive reason 3"],
      "${flavour.avgPriceLabel}": "${intent === 'buy' ? '£500k–£700k' : '£1,800–£2,400/mo'}",
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
- bullets: 3 specific, warm, positive reasons this borough suits them${intent === 'buy' ? ' as a buyer' : ' as a renter'}
- searchSlug: lowercase borough name for URL (e.g. "hammersmith-and-fulham")
- avgPrice: ${flavour.avgPriceFormat}
- ${flavour.affordability}
- If a commute destination is given, prioritise boroughs with good transport links to that destination within the stated commute time
- If the person is a student, factor in proximity to universities${intent === 'rent' ? ', student-friendly amenities, and affordable areas' : ' and good rental yield for buy-to-let'}
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
