'use client'

import { useState, useEffect } from 'react'

function extractSqm(text: string): number | null {
  const sqmMatch = text.match(/([\d,]+)\s*sq\s*m(?!ft)/i)
  const sqftMatch = text.match(/([\d,]+)\s*sq(?:uare)?\s*f(?:ee|oo)?t/i)
  const sqftMatch2 = text.match(/([\d,]+)\s*ft[²2]/i)
  const sqmMatch2 = text.match(/([\d,]+)\s*m[²2]/i)
  if (sqmMatch) return parseFloat(sqmMatch[1].replace(',', ''))
  if (sqmMatch2) return parseFloat(sqmMatch2[1].replace(',', ''))
  if (sqftMatch) return Math.round(parseFloat(sqftMatch[1].replace(',', '')) * 0.0929)
  if (sqftMatch2) return Math.round(parseFloat(sqftMatch2[1].replace(',', '')) * 0.0929)
  return null
}

interface Props {
  floorplanUrl: string
  price: number
}

export default function FloorplanSize({ floorplanUrl, price }: Props) {
  const [sizeLabel, setSizeLabel] = useState<string>('...')
  const [perSqm, setPerSqm] = useState<string>('...')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    async function fetchSize() {
      try {
        const res = await fetch('/api/floorplan-size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floorplanUrl })
        })
        const data = await res.json()
        if (data.size && data.size !== 'none') {
          const sqm = extractSqm(data.size)
          if (sqm && sqm > 10 && sqm < 1000) {
            const isSqft = /sq\s*ft|ft[²2]/i.test(data.size) && !/sq\s*m(?!ft)/i.test(data.size)
          const sqft = isSqft ? parseFloat(data.size.replace(/[^\d.]/g, '')) : Math.round(sqm * 10.764)
          const sqmRounded = isSqft ? sqm : sqm
            setSizeLabel(sqft.toLocaleString() + ' sq ft / ' + sqmRounded + ' sq m')
            const priceNum = typeof price === 'number' ? price : parseFloat(String(price))
            setPerSqm(priceNum && !isNaN(priceNum) ? '£' + Math.round(priceNum / sqm).toLocaleString() : 'Ask agent')
          } else {
            setSizeLabel(data.size)
            setPerSqm('Ask agent')
          }
        } else {
          setSizeLabel('Ask agent')
          setPerSqm('Ask agent')
        }
      } catch {
        setSizeLabel('Ask agent')
        setPerSqm('Ask agent')
      }
      setLoading(false)
    }
    fetchSize()
  }, [floorplanUrl, price, mounted])

  const label = loading ? '...' : sizeLabel
  const psm = loading ? '...' : perSqm

  if (!mounted) return (
    <>
      <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">SIZE</div>
        <div className="text-sm font-medium text-stone-700">...</div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/SQM</div>
        <div className="text-sm font-medium text-stone-700">...</div>
      </div>
    </>
  )

  return (
    <>
      <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">SIZE</div>
        <div className="text-sm font-medium text-stone-700">
          {label}
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 text-center flex flex-col items-center justify-center">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">£/SQM</div>
        <div className="text-sm font-medium text-stone-700">{psm}</div>
      </div>
    </>
  )
}
