'use client'

import { useState } from 'react'

interface Props {
  price: number
  address: string
  sourceUrl?: string | null
  source?: string | null
}

function calcStampDuty(price: number, isFirstBuyer: boolean): number {
  if (isFirstBuyer && price <= 425000) return 0
  const thresholds = isFirstBuyer
    ? [[0, 425000, 0], [425000, 625000, 0.05], [625000, 925000, 0.05], [925000, 1500000, 0.10], [1500000, Infinity, 0.12]]
    : [[0, 250000, 0], [250000, 925000, 0.05], [925000, 1500000, 0.10], [1500000, Infinity, 0.12]]
  let total = 0
  for (const [from, to, rate] of thresholds) {
    if (price > from) total += (Math.min(price, to) - from) * rate
  }
  return Math.round(total)
}

export default function BuyListingPanel({ price, address, sourceUrl, source }: Props) {
  const [deposit, setDeposit] = useState(Math.round(price * 0.1))
  const [rate, setRate] = useState(4.5)
  const [term, setTerm] = useState(25)
  const [isFirstBuyer, setIsFirstBuyer] = useState(false)

  const loanAmount = price - deposit
  const monthlyRate = rate / 100 / 12
  const numPayments = term * 12
  const monthly = loanAmount > 0 && monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : 0

  const stampDuty = calcStampDuty(price, isFirstBuyer)
  const depositPct = Math.round((deposit / price) * 100)
  const ltv = 100 - depositPct

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

      {/* Mortgage estimator */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Mortgage estimator</h3>

        <div className="flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>Deposit ({depositPct}% — {ltv}% LTV)</span>
              <span className="font-medium text-[#1C2B3A]">£{deposit.toLocaleString()}</span>
            </div>
            <input type="range" min={Math.round(price * 0.05)} max={Math.round(price * 0.5)} step={1000}
              value={deposit}
              onChange={e => setDeposit(parseInt(e.target.value))}
              className="w-full accent-[#D3755A]" />
            <div className="flex justify-between text-xs text-stone-300 mt-0.5">
              <span>5%</span><span>50%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>Interest rate</span>
              <span className="font-medium text-[#1C2B3A]">{rate.toFixed(1)}%</span>
            </div>
            <input type="range" min={1} max={10} step={0.1}
              value={rate}
              onChange={e => setRate(parseFloat(e.target.value))}
              className="w-full accent-[#D3755A]" />
            <div className="flex justify-between text-xs text-stone-300 mt-0.5">
              <span>1%</span><span>10%</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-stone-400 mb-1">
              <span>Mortgage term</span>
              <span className="font-medium text-[#1C2B3A]">{term} years</span>
            </div>
            <input type="range" min={5} max={35} step={1}
              value={term}
              onChange={e => setTerm(parseInt(e.target.value))}
              className="w-full accent-[#D3755A]" />
            <div className="flex justify-between text-xs text-stone-300 mt-0.5">
              <span>5 yrs</span><span>35 yrs</span>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-[#F5EBE0] rounded-xl p-4 text-center">
          <div className="text-xs text-stone-500 mb-1">Estimated monthly payment</div>
          <div className="text-2xl font-bold text-[#1C2B3A]">£{monthly.toLocaleString()}<span className="text-sm font-normal text-stone-400">/mo</span></div>
          <div className="text-xs text-stone-400 mt-1">£{(price - deposit).toLocaleString()} loan at {rate}% over {term} yrs</div>
        </div>
        <p className="text-xs text-stone-300 mt-2 text-center">Indicative only. Speak to a mortgage adviser.</p>
      </div>

      {/* Stamp duty */}
      <div>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Stamp duty (SDLT)</h3>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setIsFirstBuyer(!isFirstBuyer)}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isFirstBuyer ? 'bg-[#D3755A]' : 'bg-stone-200'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isFirstBuyer ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-stone-500">First-time buyer relief</span>
        </div>
        <div className="bg-[#F5EBE0] rounded-xl p-4 text-center">
          <div className="text-xs text-stone-500 mb-1">Estimated stamp duty</div>
          <div className="text-2xl font-bold text-[#1C2B3A]">
            {stampDuty === 0 ? '£0' : '£' + stampDuty.toLocaleString()}
          </div>
          {isFirstBuyer && price <= 425000 && (
            <div className="text-xs text-emerald-600 mt-1">No stamp duty as a first-time buyer</div>
          )}
        </div>
        <p className="text-xs text-stone-300 mt-2 text-center">Based on standard residential rates. Not financial advice.</p>
      </div>
    </div>
  )
}
