'use client'

import { useState } from 'react'

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

export default function StampDutyCalculator({ price }: { price: number }) {
  const [isFirstBuyer, setIsFirstBuyer] = useState(false)
  const [isAdditional, setIsAdditional] = useState(false)
  const stampDuty = calcStampDuty(price, isFirstBuyer, isAdditional)

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Stamp duty (SDLT)</h2>
      <div className="flex flex-col gap-2 mb-4">
        {[
          { label: 'First-time buyer', active: isFirstBuyer, toggle: () => { setIsFirstBuyer(!isFirstBuyer); if (!isFirstBuyer) setIsAdditional(false) } },
          { label: 'Additional property (+3%)', active: isAdditional, toggle: () => { setIsAdditional(!isAdditional); if (!isAdditional) setIsFirstBuyer(false) } },
        ].map(({ label, active, toggle }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-stone-500">{label}</span>
            <button onClick={toggle}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 overflow-hidden ${active ? 'bg-[#D3755A]' : 'bg-stone-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-[#F5EBE0] rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm text-stone-500">Estimated stamp duty</div>
        <div className="text-xl font-bold text-[#1C2B3A]">
          {stampDuty === 0 ? '£0' : '£' + stampDuty.toLocaleString()}
        </div>
      </div>
      {isFirstBuyer && price <= 300000 && (
        <p className="text-xs text-emerald-600 mt-2">No stamp duty as a first-time buyer.</p>
      )}
      <p className="text-xs text-stone-300 mt-2">Based on standard residential rates. Not financial advice.</p>
    </div>
  )
}
