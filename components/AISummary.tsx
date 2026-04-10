'use client'

import { useState, useEffect } from 'react'

interface Props {
  description: string
  address: string
  price: number
  bedrooms: number | null
  bathrooms: number | null
  propertyType: string | null
  furnished: string | null
  source: string
}

export default function AISummary({ description, address, price, bedrooms, bathrooms, propertyType, furnished, source }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, address, price, bedrooms, bathrooms, propertyType, furnished, source })
        })
        const data = await res.json()
        setSummary(data.summary || null)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    if (description) generate()
    else setLoading(false)
  }, [description])

  if (!description) return null

  function formatSummary(text: string) {
    const sections = text.split(/\n(?=OVERVIEW|KEY FACTS|HONEST TAKE)/)
    return sections.map((section, i) => {
      const lines = section.trim().split('\n')
      const heading = lines[0]
      const body = lines.slice(1).join('\n').trim()
      return { heading, body, key: i }
    })
  }

  return (
    <div className="mb-6 bg-orange-50 border border-green-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-orange-700 flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 className="text-sm font-medium text-[#1C2B3A]">NestLondon analysis</h2>
        <span className="text-xs text-orange-600 bg-green-100 px-2 py-0.5 rounded-full">AI</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-green-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-green-100 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-green-100 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-green-100 rounded animate-pulse w-full mt-3" />
          <div className="h-3 bg-green-100 rounded animate-pulse w-2/3" />
        </div>
      ) : error ? (
        <p className="text-xs text-stone-400">Analysis unavailable</p>
      ) : summary ? (
        <div className="space-y-4">
          {formatSummary(summary).map(({ heading, body, key }) => (
            <div key={key}>
              {heading && heading !== body && (
                <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">{heading}</div>
              )}
              <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-line">{body || heading}</div>
            </div>
          ))}
        </div>
      ) : null}

      <details className="mt-4 border-t border-green-100 pt-3">
        <summary className="text-xs text-stone-400 cursor-pointer hover:text-[#4A5568] select-none">Full agent description</summary>
        <p className="text-xs text-stone-500 leading-relaxed mt-2">{description}</p>
      </details>
    </div>
  )
}
