'use client'

import { useState, useEffect, useRef } from 'react'
import { Bus, Footprints, Bike, Plus, X, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import RoundelIcon, { hasRoundel } from '@/components/RoundelIcon'
import {
  type CommuteLocation, type CommuteMode,
  MAX_COMMUTE_LOCATIONS, newLocationId, migrateLegacyCommute,
} from '@/lib/commute'

interface CommuteResult {
  duration: number | null
  modes: string[]
  fare: number | null
  legs: { mode: string; duration: number; summary: string }[]
}

interface RowState extends CommuteLocation {
  mode: CommuteMode  // narrowed: every row has a concrete mode (defaults to 'public')
  result?: CommuteResult | null
  loading?: boolean
  error?: string | null
  expanded?: boolean  // journey breakdown shown? expanded by default per spec
}

// Force every incoming location to have a concrete mode and start expanded.
function hydrate(locs: CommuteLocation[]): RowState[] {
  return locs.map(l => ({
    ...l,
    mode: (l.mode === 'walk' || l.mode === 'bike') ? l.mode : 'public',
    expanded: true,
  }))
}

export default function CommuteWidget({
  listingPostcode,
  listingLat,
  listingLng,
  initialCommuteAddress,
  initialCommuteMode,
  initialCommuteLocations,
}: {
  listingPostcode?: string | null
  listingLat?: number | null
  listingLng?: number | null
  initialCommuteAddress?: string | null
  initialCommuteMode?: string | null
  initialCommuteLocations?: CommuteLocation[]
}) {
  const seedRaw = (initialCommuteLocations && initialCommuteLocations.length > 0)
    ? initialCommuteLocations
    : migrateLegacyCommute(undefined, initialCommuteAddress, initialCommuteMode)

  const [rows, setRows] = useState<RowState[]>(hydrate(seedRaw))

  // Refresh from /api/commute/saved on mount in case metadata changed elsewhere
  // and we were seeded empty.
  const didFetchSaved = useRef(false)
  useEffect(() => {
    if (didFetchSaved.current) return
    didFetchSaved.current = true
    if (rows.length > 0) return
    fetch('/api/commute/saved')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.commute_locations) && d.commute_locations.length > 0) {
          setRows(hydrate(d.commute_locations))
        }
      })
      .catch(() => {})
  }, [])

  const fromCoord = listingPostcode
    ? listingPostcode.replace(/\s/g, '')
    : (listingLat && listingLng) ? `${listingLat},${listingLng}` : null

  // Calculate one row. Uses the row's concrete mode (always set).
  async function calculateRow(row: RowState): Promise<CommuteResult | null> {
    if (!fromCoord || !row.address.trim()) return null
    const res = await fetch(`/api/commute?from=${encodeURIComponent(fromCoord)}&to=${encodeURIComponent(row.address)}&mode=${encodeURIComponent(row.mode)}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }

  // Refresh whenever a row's address or mode changes. Dependency string captures the salient fields.
  useEffect(() => {
    if (!fromCoord) return
    let cancelled = false
    rows.forEach(async (row, idx) => {
      if (!row.address.trim()) return
      // Skip if we already have a result for this exact address+mode combination.
      // The dep string ensures we re-run on change, but inside the loop we still want to avoid
      // re-calculating untouched rows when an unrelated row changes.
      if (row.result !== undefined && !row.loading && !row.error) return
      try {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, loading: true, error: null } : r))
        const result = await calculateRow(row)
        if (cancelled) return
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, result, loading: false } : r))
      } catch {
        if (cancelled) return
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, loading: false, error: 'Could not calculate' } : r))
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCoord, rows.map(r => r.id + '|' + r.address + '|' + r.mode).join(',')])

  // Debounced persistence to user metadata.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function persistRows(next: RowState[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const payload = next
        .filter(r => r.address.trim())
        .map(r => ({
          id: r.id, address: r.address, label: r.label, timeLimit: r.timeLimit, mode: r.mode,
        }))
      fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commute_locations: payload }),
      }).catch(() => {})
    }, 600)
  }

  function addRow() {
    if (rows.length >= MAX_COMMUTE_LOCATIONS) return
    const next: RowState[] = [...rows, {
      id: newLocationId(),
      label: '',
      address: '',
      timeLimit: null,
      mode: 'public',
      expanded: true,
    }]
    setRows(next)
  }
  function updateRow(id: string, patch: Partial<RowState>) {
    const next = rows.map(r => {
      if (r.id !== id) return r
      // If address or mode changes, invalidate the cached result so the effect re-fetches.
      const invalidate = 'address' in patch || 'mode' in patch
      return { ...r, ...patch, result: invalidate ? undefined : r.result }
    })
    setRows(next)
    const row = next.find(r => r.id === id)
    if (row && row.address.trim()) persistRows(next)
  }
  function removeRow(id: string) {
    const next = rows.filter(r => r.id !== id)
    setRows(next)
    persistRows(next)
  }
  function toggleExpanded(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, expanded: !r.expanded } : r))
  }

  function fmtDuration(mins: number | null | undefined): string | null {
    if (mins == null) return null
    return mins < 60 ? `${mins} mins` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  // Small helper: leg icon by mode string from TfL.
  // TfL modes (tube/overground/elizabeth/dlr/tram/bus/national-rail) get the official roundel.
  // Non-TfL modes (walking/cycling) get a lucide icon.
  function LegIcon({ mode }: { mode: string }) {
    if (hasRoundel(mode)) {
      // 14px for compact leg display — close to the original 'w-3 h-3' (12px) but slightly
      // larger so the roundel text inside (UNDERGROUND, OVERGROUND, etc.) remains legible.
      return <RoundelIcon mode={mode} size={14} />
    }
    const m = mode.toLowerCase()
    if (m.includes('cycle') || m.includes('bike')) {
      return <Bike className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
    }
    // walking / default
    return <Footprints className="w-3 h-3 flex-shrink-0" strokeWidth={1.75} />
  }

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'rgba(211,117,90,0.10)'}}>
          <svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#1B2E4B]">Commute times</div>
          <div className="text-xs text-[#9B928E]">Powered by TfL</div>
        </div>
        <span className="text-[10px] text-[#9B928E]">{rows.length}/{MAX_COMMUTE_LOCATIONS}</span>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <p className="text-xs text-[#9B928E] mb-3">Add up to {MAX_COMMUTE_LOCATIONS} places you commute to. Times update as you type.</p>
      )}

      {/* Rows */}
      <div className="flex flex-col gap-3 mb-3">
        {rows.map((row, idx) => {
          const durationLabel = fmtDuration(row.result?.duration)
          const hasLegs = !!(row.result?.legs && row.result.legs.length > 0)
          return (
            <div key={row.id} className="border border-[#E8E2DA] rounded-xl p-3 bg-[#FAFAF8]">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })}
                  placeholder={`Location ${idx + 1} (e.g. Work)`}
                  maxLength={40}
                  className="flex-1 border border-[#E8E2DA] rounded-lg px-2.5 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                />
                <button type="button" onClick={() => removeRow(row.id)}
                  className="text-[#9B928E] hover:text-red-500 transition-colors p-1 flex-shrink-0"
                  aria-label="Remove location">
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
              <input
                type="text"
                value={row.address}
                onChange={e => updateRow(row.id, { address: e.target.value })}
                placeholder="Postcode or station (e.g. EC1A 1BB)"
                className="w-full border border-[#E8E2DA] rounded-lg px-2.5 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white mb-2"
              />

              {/* Per-row mode pills with icons. Defaults to 'public'. */}
              <div className="flex items-center gap-1 mb-2">
                {([
                  { v: 'public' as const, label: 'Public', Icon: Bus },
                  { v: 'walk' as const, label: 'Walk', Icon: Footprints },
                  { v: 'bike' as const, label: 'Bike', Icon: Bike },
                ]).map(({ v, label, Icon }) => {
                  const active = row.mode === v
                  return (
                    <button key={v} type="button" onClick={() => updateRow(row.id, { mode: v })}
                      className={'flex-1 px-1.5 py-1 rounded-md text-[10px] inline-flex items-center justify-center gap-1 transition-colors ' + (active ? 'bg-[#1B2E4B] text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}>
                      <Icon className="w-3 h-3" strokeWidth={1.75} />
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Summary line — duration + collapse toggle for breakdown */}
              {row.address.trim() ? (
                <>
                  <div className="bg-[#F5EBE0] rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#D3755A] flex-shrink-0" strokeWidth={1.75} />
                    <span className="text-xs text-[#1B2E4B] flex-1 min-w-0 truncate">
                      {row.loading
                        ? 'Calculating…'
                        : row.error
                          ? row.error
                          : durationLabel
                            ? <>{durationLabel} <span className="text-[#9B928E]">via {row.mode}</span></>
                            : 'No route found'}
                    </span>
                    {hasLegs && (
                      <button type="button" onClick={() => toggleExpanded(row.id)}
                        className="text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0"
                        aria-label={row.expanded ? 'Hide journey breakdown' : 'Show journey breakdown'}>
                        {row.expanded
                          ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
                          : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                        }
                      </button>
                    )}
                  </div>

                  {/* Expandable leg breakdown */}
                  {hasLegs && row.expanded && (
                    <div className="flex flex-col gap-1.5 mt-2 px-1">
                      {row.result!.legs.map((leg, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                          <span className="flex items-center gap-1 text-xs text-[#9B928E] capitalize w-20 flex-shrink-0">
                            <LegIcon mode={leg.mode} />
                            <span className="truncate">{leg.mode.replace(/-/g, ' ')}</span>
                          </span>
                          <span className="flex-1 truncate text-[#9B928E]">{leg.summary || leg.mode}</span>
                          <span className="font-medium flex-shrink-0 text-[#1B2E4B]">{leg.duration} min</span>
                        </div>
                      ))}
                      {row.result?.fare != null && (
                        <div className="text-[10px] text-[#9B928E] mt-1">~£{row.result.fare} fare (off-peak)</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-[#9B928E] italic">Enter an address to see commute time.</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <button type="button" onClick={addRow}
        disabled={rows.length >= MAX_COMMUTE_LOCATIONS}
        className="w-full px-3 py-2 rounded-xl border border-dashed border-[#E8E2DA] text-xs text-[#9B928E] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
        {rows.length === 0 ? 'Add a commute location' : rows.length >= MAX_COMMUTE_LOCATIONS ? `Maximum ${MAX_COMMUTE_LOCATIONS} locations` : 'Add another location'}
      </button>
    </div>
  )
}
