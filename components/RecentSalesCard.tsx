import type { SoldPriceComparison } from '@/lib/soldPriceComparables'

/**
 * Recent sales card: the 5 most recent comparable sold properties in the area.
 * Concrete examples that anchor the abstract percentile stats in the other cards.
 */
export default function RecentSalesCard({ comparison }: { comparison: SoldPriceComparison | null }) {
  if (!comparison || !comparison.recentSales || comparison.recentSales.length === 0) return null

  const { recentSales, postcodeDistrict, propertyTypeLabel } = comparison

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1C2B3A]">Recently sold nearby</h2>
        <span className="text-xs text-stone-400">{postcodeDistrict} {propertyTypeLabel}</span>
      </div>

      <ul className="space-y-3">
        {recentSales.map((s, i) => {
          const addressParts = [s.saon, s.paon, s.street].filter(Boolean)
          const address = addressParts.join(' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
          const date = new Date(s.date)
          const dateLabel = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
          return (
            <li key={i} className="flex items-baseline justify-between border-b border-[#E8E2DA] last:border-0 pb-3 last:pb-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1C2B3A] truncate">{address || 'Unknown address'}</div>
                <div className="text-xs text-stone-500 mt-0.5">{dateLabel}</div>
              </div>
              <div className="ml-4 text-sm font-semibold text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
                £{s.price.toLocaleString()}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-[11px] text-stone-400 mt-4">
        Source: HM Land Registry Price Paid Data.
      </p>
    </div>
  )
}
