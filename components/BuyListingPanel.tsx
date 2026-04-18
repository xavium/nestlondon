'use client'

import { useState } from 'react'

interface Props {
  price: number
  address: string
  sourceUrl?: string | null
  source?: string | null
}

function calcStampDuty(price: number, isFirstBuyer: boolean, isAdditional: boolean): number {
  let thresholds: [number, number, number][]
  if (isFirstBuyer && price <= 500000) {
    thresholds = [[0, 300000, 0], [300000, 500000, 0.05]]
  } else {
    thresholds = [[0, 125000, 0], [125000, 250000, 0.02], [250000, 925000, 0.05], [925000, 1500000, 0.10], [1500000, Infinity, 0.12]]
  }
  let total = 0
  for (const [from, to, rate] of thresholds) {
    if (price > from) total += (Math.min(price, to) - from) * rate
  }
  if (isAdditional) total += price * 0.03
  return Math.round(total)
}

export default function BuyListingPanel({ price, address, sourceUrl, source }: Props) {
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-5">
      {/* Price */}
      <div>
        <div className="text-3xl font-bold text-[#1C2B3A]" style={{fontFamily: 'Georgia, serif'}}>
          £{price.toLocaleString()}
        </div>
        <div className="text-sm text-stone-400 mt-0.5">Asking price</div>
      </div>

      {/* CTA */}
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full text-white text-sm rounded-xl py-3 text-center hover:opacity-90 transition-opacity"
          style={{background: '#D3755A'}}>
          View on {source || 'portal'} →
        </a>
      ) : (
        <div className="w-full bg-stone-100 text-stone-400 text-sm rounded-xl py-3 text-center">Source unavailable</div>
      )}

    </div>
  )
}
