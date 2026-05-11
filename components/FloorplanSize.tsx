'use client'

import { useState, useEffect } from 'react'
import TileIcon from '@/components/TileIcon'

function extractSqm(text: string): number | null {
  // Accept decimals and optional period after 'sq' (e.g. "47.8 sq. m")
  const sqmMatch = text.match(/([\d,]+\.?\d*)\s*sq\.?\s*m(?!ft)/i)
  const sqftMatch = text.match(/([\d,]+\.?\d*)\s*sq\.?(?:uare)?\s*f(?:ee|oo)?t/i)
  const sqftMatch2 = text.match(/([\d,]+\.?\d*)\s*ft[²2]/i)
  const sqmMatch2 = text.match(/([\d,]+\.?\d*)\s*m[²2]/i)
  if (sqmMatch) return Math.round(parseFloat(sqmMatch[1].replace(',', '')))
  if (sqmMatch2) return Math.round(parseFloat(sqmMatch2[1].replace(',', '')))
  if (sqftMatch) return Math.round(parseFloat(sqftMatch[1].replace(',', '')) * 0.0929)
  if (sqftMatch2) return Math.round(parseFloat(sqftMatch2[1].replace(',', '')) * 0.0929)
  return null
}

interface Props {
  floorplanUrl: string
  price: number
  listingId?: string
}

export default function FloorplanSize({ floorplanUrl, price, listingId }: Props) {
  const [sqft, setSqft] = useState<number | null>(null)
  const [sqm, setSqm] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    async function fetchSize() {
      try {
        const res = await fetch('/api/floorplan-size', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floorplanUrl, listingId })
        })
        const data = await res.json()
        if (data.size && data.size !== 'none') {
          const parsedSqm = extractSqm(data.size)
          if (parsedSqm && parsedSqm > 10 && parsedSqm < 1000) {
            setSqm(parsedSqm)
            setSqft(Math.round(parsedSqm * 10.764))
          }
        }
      } catch {}
      setLoading(false)
    }
    fetchSize()
  }, [floorplanUrl, price, mounted, listingId])

  const priceNum = typeof price === 'number' ? price : parseFloat(String(price))
  const pricePerSqft = sqft && priceNum ? Math.round(priceNum / sqft) : null
  const pricePerSqm = sqm && priceNum ? Math.round(priceNum / sqm) : null

  const sizeText = sqft ? sqft.toLocaleString() + ' sq ft' : (loading ? '...' : 'Ask agent')
  const sizeSubtext = sqm ? sqm.toLocaleString() + ' sq m' : null
  const psqftText = pricePerSqft ? '£' + pricePerSqft.toLocaleString() + ' / sq ft' : (loading ? '...' : 'Ask agent')
  const psqmText = pricePerSqm ? '£' + pricePerSqm.toLocaleString() + ' / sq m' : null

  return (
    <>
      <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
        <TileIcon name="Size" />
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Size</div>
        <div className="text-sm font-semibold text-[#374151]">{sizeText}</div>
        {sizeSubtext && <div className="text-xs text-stone-400 mt-0.5">{sizeSubtext}</div>}
      </div>
      <div className="bg-white border border-[#E8E2DA] rounded-xl p-4 text-center flex flex-col items-center justify-center h-full">
        <TileIcon name="£/sqm" />
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Price / size</div>
        <div className="text-sm font-semibold text-[#374151]">{psqftText}</div>
        {psqmText && <div className="text-xs text-stone-400 mt-0.5">{psqmText}</div>}
      </div>
    </>
  )
}
