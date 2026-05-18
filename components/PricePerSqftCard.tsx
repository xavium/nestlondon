import type { PricePerSqftComparison } from '@/lib/pricePerSqftComparables'

/**
 * Price-per-sqft card: how does this listing's £/sqft compare to other asking
 * prices for similar properties in the same area? This is the "value per area"
 * angle — independent of total price.
 */
export default function PricePerSqftCard({
  comparison,
}: {
  comparison: PricePerSqftComparison | null
}) {
  if (!comparison) return null

  const { listingPricePerSqft, medianPricePerSqft, p25, p75, sampleSize, confidence, signal, postcodeDistrict, propertyTypeLabel, deltaPercent } = comparison

  const gaugeMin = Math.min(p25, listingPricePerSqft) * 0.85
  const gaugeMax = Math.max(p75, listingPricePerSqft) * 1.15
  const gaugeRange = gaugeMax - gaugeMin || 1
  const pctOf = (v: number) => Math.max(0, Math.min(100, ((v - gaugeMin) / gaugeRange) * 100))

  const p25Pct = pctOf(p25)
  const p75Pct = pctOf(p75)
  const medianPct = pctOf(medianPricePerSqft)
  const listingPct = pctOf(listingPricePerSqft)

  const signalLabel =
    signal === 'above' ? `${deltaPercent > 0 ? '+' : ''}${deltaPercent}% above local average` :
    signal === 'below' ? `${deltaPercent}% below local average` :
    'In line with local average'
  const signalColor =
    signal === 'above' ? 'text-orange-700 bg-orange-50 border-orange-100' :
    signal === 'below' ? 'text-green-700 bg-green-50 border-green-100' :
    'text-stone-700 bg-stone-100 border-stone-200'

  const confidenceLabel =
    confidence === 'high' ? `High confidence · ${sampleSize} comparable listings` :
    confidence === 'medium' ? `Medium confidence · ${sampleSize} comparable listings` :
    `Limited data · only ${sampleSize} comparable listings`

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-[#1C2B3A]">Price per square foot</h2>
        <span className="text-xs text-stone-400">{postcodeDistrict} {propertyTypeLabel}, current asking prices</span>
      </div>
      <p className="text-xs text-stone-500 mb-4">{confidenceLabel}</p>

      <div className="mb-5">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${signalColor}`}>
          {signalLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="text-center">
          <div className="text-xs text-stone-500 mb-1">This listing</div>
          <div className="text-lg font-semibold" style={{ color: '#D3755A', fontFamily: 'Georgia, serif' }}>
            £{listingPricePerSqft.toLocaleString()}<span className="text-xs text-stone-500 font-normal ml-1">/sqft</span>
          </div>
        </div>
        <div className="text-center border-l border-[#E8E2DA]">
          <div className="text-xs text-stone-500 mb-1">Local median</div>
          <div className="text-lg font-semibold text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            £{medianPricePerSqft.toLocaleString()}<span className="text-xs text-stone-500 font-normal ml-1">/sqft</span>
          </div>
        </div>
      </div>

      <div>
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-4 h-2 bg-[#F0EBE3] rounded-full" />
          <div
            className="absolute top-4 h-2 rounded-full"
            style={{ left: p25Pct + '%', width: (p75Pct - p25Pct) + '%', background: '#D3755A33' }}
          />
          <div
            className="absolute top-3 w-px h-4 bg-[#1C2B3A]"
            style={{ left: medianPct + '%' }}
            title={'Median £' + medianPricePerSqft.toLocaleString() + '/sqft'}
          />
          <div
            className="absolute top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ left: 'calc(' + listingPct + '% - 6px)', background: '#D3755A' }}
            title={'This listing £' + listingPricePerSqft.toLocaleString() + '/sqft'}
          />
          <div
            className="absolute top-7 text-[10px] font-medium text-[#D3755A] whitespace-nowrap"
            style={{ left: 'calc(' + listingPct + '% - 20px)' }}
          >
            This listing
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>£{Math.round(gaugeMin).toLocaleString()}/sqft</span>
          <span>£{Math.round(gaugeMax).toLocaleString()}/sqft</span>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-4">
        £/sqft vs other current asking prices for similar properties in this area (not sold prices).
      </p>
    </div>
  )
}
