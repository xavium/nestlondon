'use client'

import { useState, useEffect } from 'react'

interface Props {
  listing: {
    address: string
    price: number
    bedrooms: number | null
    property_type: string | null
    square_feet: number | null
    borough: string | null
    description?: string
  }
  views: number
  shares: number
  daysListed: number
  avgMarketDays: number | null
  imageCount: number
  priceDiff: number | null
  mySqftPrice: number | null
  avgCompSqftPrice: number | null
  compCount: number
}

export default function ListingPerformanceSummary(props: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setSummary(null)
    setError(false)
  }, [props.listing.address])

  async function generateSummary() {
    setLoading(true)
    setError(false)
    try {
      const prompt = `You are a property listing advisor. Analyse this rental listing's performance and give concise, actionable advice.

Property: ${props.listing.address}
Type: ${props.listing.property_type}, ${props.listing.bedrooms === 0 ? 'Studio' : (props.listing.bedrooms || '?') + ' bed'}, ${props.listing.borough}
Price: £${props.listing.price?.toLocaleString()}/mo${props.mySqftPrice ? ` (£${props.mySqftPrice}/sqft)` : ''}
Size: ${props.listing.square_feet ? props.listing.square_feet + ' sq ft' : 'not listed'}
Description length: ${props.listing.description ? props.listing.description.length + ' characters' : 'none'}

Performance data:
- Views: ${props.views} total
- Shares: ${props.shares}
- Days listed: ${props.daysListed}${props.avgMarketDays ? ` (similar properties avg ${props.avgMarketDays} days)` : ''}
- Photos: ${props.imageCount} uploaded
- Comparable listings in area: ${props.compCount}
${props.priceDiff !== null ? `- Price vs area average: ${props.priceDiff > 0 ? '+' : ''}${props.priceDiff}%` : ''}
${props.avgCompSqftPrice ? `- Area avg £/sqft: £${props.avgCompSqftPrice}` : ''}

You are a helpful property advisor writing a short performance update for a private landlord. Write 1-2 conversational sentences summarising how the listing is doing based on the data. Then offer 2-3 practical tips as bullet points — things like enriching the description to give a sense of who the home suits, adding more photos, or reviewing the price against nearby listings. Keep the tone natural and supportive, as if chatting with a friend. Avoid dramatic language. Plain text only, no markdown headers.`

      const response = await fetch('/api/listing-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      setSummary(text)
      setExpanded(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // Parse summary into intro + bullets
  function parseSummary(text: string) {
    const lines = text.split('\n').filter(l => l.trim())
    const bullets: string[] = []
    const intro: string[] = []
    for (const line of lines) {
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        bullets.push(line.trim().replace(/^[•\-*]\s*/, ''))
      } else {
        intro.push(line)
      }
    }
    return { intro: intro.join(' '), bullets }
  }

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'rgba(211,117,90,0.10)'}}>
            <svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-[#1B2E4B]">AI Performance Analysis</div>
            <div className="text-xs text-[#9B928E]">Personalised recommendations for your listing</div>
          </div>
        </div>
        {!summary && !loading && (
          <button onClick={generateSummary}
            className="text-xs px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90 flex-shrink-0"
            style={{background:'#D3755A'}}>
            Analyse listing
          </button>
        )}
        {summary && (
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs text-[#9B928E] hover:text-[#3D3A38]">
            {expanded ? 'Hide ▲' : 'Show ▼'}
          </button>
        )}
      </div>

      {loading && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 text-xs text-[#9B928E]">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{background:'#D3755A'}}></div>
            Analysing your listing performance...
          </div>
        </div>
      )}

      {error && (
        <div className="px-5 pb-4 text-xs text-red-500">
          Could not generate analysis. <button onClick={generateSummary} className="underline">Try again</button>
        </div>
      )}

      {summary && expanded && (
        <div className="px-5 pb-5 border-t border-[#F5EBE0]">
          {(() => {
            const { intro, bullets } = parseSummary(summary)
            return (
              <>
                {intro && <p className="text-sm text-[#3D3A38] leading-relaxed mt-4 mb-3">{intro}</p>}
                {bullets.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {bullets.map((b, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-[#F5EBE0] rounded-xl px-3 py-2.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-xs text-[#3D3A38] leading-relaxed">{b}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={generateSummary}
                  className="mt-3 text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors">
                  Regenerate ↺
                </button>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
