import type { CategorisedAmenities, AmenityCategory } from '@/lib/amenities'
import { CATEGORY_META, formatDistance, walkMinutes } from '@/lib/amenities'
import { Coffee, ShoppingCart, UtensilsCrossed, Trees, Dumbbell, Stethoscope } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<AmenityCategory, LucideIcon> = {
  cafe: Coffee,
  supermarket: ShoppingCart,
  restaurant: UtensilsCrossed,
  park: Trees,
  gym: Dumbbell,
  gp: Stethoscope,
}

const ORDER: AmenityCategory[] = ['cafe', 'supermarket', 'restaurant', 'park', 'gym', 'gp']

export default function AmenitiesPanel({ amenities }: { amenities: CategorisedAmenities }) {
  // If every category is empty (e.g. listing has no coords, or Overpass entirely failed
  // on a fresh listing), don't render the section.
  const totalRows = ORDER.reduce((sum, k) => sum + amenities[k].length, 0)
  if (totalRows === 0) return null

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-[#1C2B3A] mb-1">What&rsquo;s nearby</h2>
      <p className="text-xs text-stone-500 mb-4">Within 1km walk</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {ORDER.map(cat => {
          const items = amenities[cat]
          if (items.length === 0) return null
          const Icon = ICONS[cat]
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-[#D3755A]" strokeWidth={1.75} />
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{CATEGORY_META[cat].label}</h3>
              </div>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item.id || item.name + item.distance_meters} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-[#374151] truncate">{item.name}</span>
                    <span className="text-xs text-stone-400 flex-shrink-0">
                      {formatDistance(item.distance_meters)} · {walkMinutes(item.distance_meters)} min walk
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
