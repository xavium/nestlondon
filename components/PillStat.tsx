import { Bed, Bath, Home, House, Building2, Hotel, LandPlot, Layers, Ruler, Trees } from 'lucide-react'

type IconKey = 'bed' | 'bath' | 'home' | 'floor' | 'size' | 'outside'

const STATIC_ICONS: Record<IconKey, React.ComponentType<{ className?: string, strokeWidth?: number }>> = {
  bed: Bed,
  bath: Bath,
  home: House, // fallback if no propertyType provided
  floor: Layers,
  size: Ruler,
  outside: Trees,
}

function resolvePropertyTypeIcon(label: string): React.ComponentType<{ className?: string, strokeWidth?: number }> {
  const s = label.toLowerCase()
  // Apartment-y types
  if (/flat|apartment|penthouse|studio|maisonette|block of/.test(s)) return Building2
  // Joined houses
  if (/semi.?detached|terrac|end of terrace|mews/.test(s)) return Hotel
  // Standalone houses
  if (/^detached|detached bungalow|link detached/.test(s)) return Home
  // Plots
  if (/^plot$/.test(s)) return LandPlot
  // Generic house fallback
  return House
}

export default function PillStat({ icon, label, className }: { icon: IconKey, label: React.ReactNode, className?: string }) {
  // For 'home' icon, resolve a more specific icon if the label is a recognised property type
  let Icon = STATIC_ICONS[icon]
  let displayLabel = label
  if (icon === 'home' && typeof label === 'string') {
    Icon = resolvePropertyTypeIcon(label)
    // Normalise 'Apartment' → 'Flat' for display
    if (label.toLowerCase() === 'apartment') displayLabel = 'Flat'
  }
  return (
    <span className={'text-xs bg-stone-100 text-[#4A5568] px-2 py-1 rounded-full inline-flex items-center gap-1 ' + (className || '')}>
      <Icon className="w-3 h-3" strokeWidth={1.75} />
      {displayLabel}
    </span>
  )
}
