import type { SoldPriceComparison } from '@/lib/soldPriceComparables'

/**
 * Percentile rank card: where does this listing sit in the distribution of
 * recent SOLD prices in the same postcode district + property type?
 *
 * Companion cards: PricePerSqftCard, RecentSalesCard.
 */
export default function PercentileRankCard({
  comparison,
  listingPrice,
}: {
  comparison: SoldPriceComparison | null
  listingPrice: number | null
}) {
  if (!comparison) return null

  const { sampleSize, confidence, median, p25, p75, min, max, listingPercentile, signal, postcodeDistrict, propertyTypeLabel } = comparison

  const gaugeMin = min
  const gaugeMax = max
  const gaugeRange = gaugeMax - gaugeMin || 1
  const pctOf = (v: number) => Math.max(0, Math.min(100, ((v - gaugeMin) / gaugeRange) * 100))

  const p25Pct = pctOf(p25)
  const p75Pct = pctOf(p75)
  const medianPct = pctOf(median)
  const listingPct = listingPrice ? pctOf(listingPrice) : null

  const signalLabel =
    signal === 'above' ? 'Above the sold-price range' :
    signal === 'below' ? 'Below the sold-price range' :
    signal === 'within' ? 'Within the sold-price range' : null
  const signalColor =
    signal === 'above' ? 'text-orange-700 bg-orange-50 border-orange-100' :
    signal === 'below' ? 'text-green-700 bg-green-50 border-green-100' :
    signal === 'within' ? 'text-stone-700 bg-stone-100 border-stone-200' :
    'text-stone-600 bg-stone-50 border-stone-200'

  const confidenceLabel =
    confidence === 'high' ? `High confidence · ${sampleSize} recent sales` :
    confidence === 'medium' ? `Medium confidence · ${sampleSize} recent sales` :
    `Limited data · only ${sampleSize} recent sales`

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-[#1C2B3A]">Where this listing sits vs sold prices</h2>
        <span className="text-xs text-stone-400">{postcodeDistrict} {propertyTypeLabel}, last 12 months</span>
      </div>
      <p className="text-xs text-stone-500 mb-4">{confidenceLabel}</p>

      {signal && (
        <div className="mb-5">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${signalColor}`}>
            {signalLabel}
          </span>
          {listingPercentile != null && (
            <span className="ml-2 text-xs text-stone-500">
              This listing is in the {ordinal(listingPercentile)} percentile
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5 text-center">
        <div>
          <div className="text-xs text-stone-500 mb-1">25th percentile</div>
          <div className="text-sm font-semibold text-[#1C2B3A]">£{p25.toLocaleString()}</div>
        </div>
        <div className="border-x border-[#E8E2DA]">
          <div className="text-xs text-stone-500 mb-1">Median</div>
          <div className="text-base font-semibold text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            £{median.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-stone-500 mb-1">75th percentile</div>
          <div className="text-sm font-semibold text-[#1C2B3A]">£{p75.toLocaleString()}</div>
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
            title={'Median £' + median.toLocaleString()}
          />
          {listingPct != null && (
            <>
              <div
                className="absolute top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                style={{ left: 'calc(' + listingPct + '% - 6px)', background: '#D3755A' }}
                title={'This listing £' + listingPrice?.toLocaleString()}
              />
              <div
                className="absolute top-7 text-[10px] font-medium text-[#D3755A] whitespace-nowrap"
                style={{ left: 'calc(' + listingPct + '% - 20px)' }}
              >
                This listing
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>£{(min/1000).toFixed(0)}k</span>
          <span>£{(max/1000000).toFixed(1)}m</span>
        </div>
      </div>

      <p className="text-[11px] text-stone-400 mt-4">
        Source: HM Land Registry Price Paid Data (sold prices, not asking).
      </p>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
