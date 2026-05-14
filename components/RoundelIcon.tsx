/**
 * RoundelIcon — renders the appropriate TfL roundel (or National Rail double-arrow)
 * for a given transport mode string. Mode strings come from the TfL Journey Planner
 * API and vary in exact spelling, so we fuzzy-match.
 *
 * Usage:
 *   <RoundelIcon mode="tube" />
 *   <RoundelIcon mode="london-underground" className="w-4 h-4" />
 *
 * Returns null for unknown modes — callers (e.g. CommuteWidget) should have their
 * own fallback (lucide icons for walk/cycle/drive).
 */
import Image from 'next/image'

/** Maps a fuzzy mode string to a roundel file in public/transport/ and an accessible label. */
function resolveRoundel(mode: string): { src: string; alt: string } | null {
  const m = mode.toLowerCase()

  // Order matters — most specific first. National Rail before generic 'rail' patterns.
  if (m.includes('national-rail') || m.includes('national_rail') || m.includes('overground-rail')) {
    return { src: '/transport/national_rail.svg', alt: 'National Rail' }
  }
  if (m.includes('elizabeth') || m.includes('crossrail') || m.includes('tfl-rail')) {
    return { src: '/transport/elizabeth.svg', alt: 'Elizabeth line' }
  }
  if (m.includes('overground')) {
    return { src: '/transport/overground.svg', alt: 'London Overground' }
  }
  if (m.includes('dlr') || m.includes('docklands')) {
    return { src: '/transport/dlr.svg', alt: 'DLR' }
  }
  if (m.includes('tram')) {
    return { src: '/transport/tram.svg', alt: 'Tram' }
  }
  if (m.includes('bus') || m.includes('coach')) {
    return { src: '/transport/bus.svg', alt: 'Bus' }
  }
  // Generic underground / tube — checked last to avoid swallowing 'overground'.
  if (m.includes('tube') || m.includes('underground') || m.includes('metro')) {
    return { src: '/transport/tube.svg', alt: 'London Underground' }
  }
  return null
}

interface RoundelIconProps {
  mode: string
  className?: string
  /** Pixel size — rendered as a square. Defaults to 16. */
  size?: number
}

export default function RoundelIcon({ mode, className = '', size = 16 }: RoundelIconProps) {
  const r = resolveRoundel(mode)
  if (!r) return null
  return (
    <Image
      src={r.src}
      alt={r.alt}
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
      // SVG roundels are static assets — let Next.js serve them directly
      // rather than running them through image optimization (it doesn't optimize SVGs anyway).
      unoptimized
    />
  )
}

/** Exported so callers can decide whether to render a roundel or fall back to lucide. */
export function hasRoundel(mode: string): boolean {
  return resolveRoundel(mode) !== null
}
