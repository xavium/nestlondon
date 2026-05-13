'use client'

import { useState, useEffect, useRef } from 'react'
import { Bus, Footprints, Bike, Plus, X, MapPin } from 'lucide-react'
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

// Per-row state held in the widget: the location plus its computed result and load flag.
interface RowState extends CommuteLocation {
  result?: CommuteResult | null
  loading?: boolean
  error?: string | null
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
  // Seed from props. The parent (listing page) resolves URL → metadata → legacy migration before passing in.
  const seed = (initialCommuteLocations && initialCommuteLocations.length > 0)
    ? initialCommuteLocations
    : migrateLegacyCommute(undefined, initialCommuteAddress, initialCommuteMode)

  const [rows, setRows] = useState<RowState[]>(seed)
  const [globalMode, setGlobalMode] = useState<CommuteMode>(
    (initialCommuteMode === 'public' || initialCommuteMode === 'walk' || initialCommuteMode === 'bike') ? initialCommuteMode : 'public'
  )

  // Refresh from /api/commute/saved on mount in case metadata changed elsewhere (e.g. user
  // added a location from the search filters panel and then navigated to a listing).
  // Skip if we already have rows passed in via props.
  const didFetchSaved = useRef(false)
  useEffect(() => {
    if (didFetchSaved.current) return
    didFetchSaved.current = true
    if (rows.length > 0) return
    fetch('/api/commute/saved')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.commute_locations) && d.commute_locations.length > 0) {
          setRows(d.commute_locations)
        }
        if (d.commute_mode === 'public' || d.commute_mode === 'walk' || d.commute_mode === 'bike') {
          setGlobalMode(d.commute_mode)
        }
      })
      .catch(() => {})
  }, [])

  const fromCoord = listingPostcode
    ? listingPostcode.replace(/\s/g, '')
    : (listingLat && listingLng) ? `${listingLat},${listingLng}` : null

  // Calculate one row.
  async function calculateRow(row: RowState): Promise<CommuteResult | null> {
    if (!fromCoord || !row.address.trim()) return null
    const mode = row.mode || globalMode
    const res = await fetch(`/api/commute?from=${encodeURIComponent(fromCoord)}&to=${encodeURIComponent(row.address)}&mode=${encodeURIComponent(mode)}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data
  }

  // Refresh all results when rows or globalMode change. Only fetches for addressed rows.
  useEffect(() => {
    if (!fromCoord) return
    let cancelled = false
    rows.forEach(async (row, idx) => {
      if (!row.address.trim()) return
      if (row.result !== undefined && !row.loading) {
        // If address didn't change and we have a result already, leave it alone.
        // Detected via the dependency below; this is only for safety.
      }
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
    // Trigger when address or mode of any row changes, or global mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCoord, globalMode, rows.map(r => r.id + '|' + r.address + '|' + (r.mode || '')).join(',')])

  // Persist locations to user metadata. Debounced via a ref to avoid spamming PATCHes while typing.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function persistRows(next: RowState[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const payload = next.map(r => ({
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
      id: newLocationId(), label: '', address: '', timeLimit: null, mode: undefined,
    }]
    setRows(next)
    // Don't persist empty row yet — wait for address.
  }
  function updateRow(id: string, patch: Partial<CommuteLocation>) {
    const next = rows.map(r => r.id === id ? { ...r, ...patch, result: 'address' in patch || 'mode' in patch ? undefined : r.result } : r)
    setRows(next)
    if (next.find(r => r.id === id)?.address.trim()) persistRows(next)
  }
  function removeRow(id: string) {
    const next = rows.filter(r => r.id !== id)
    setRows(next)
    persistRows(next)
  }
  function setMode(m: CommuteMode) {
    setGlobalMode(m)
    // Persist global mode separately — it's its own user metadata field.
    fetch('/api/commute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commute_mode: m }),
    }).catch(() => {})
  }

  function fmtDuration(mins: number | null | undefined): string | null {
    if (mins == null) return null
    return mins < 60 ? `${mins} mins` : `${Math.floor(mins / 60)}h ${mins % 60}m`
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

      {/* Global default mode */}
      <div className="text-xs text-[#9B928E] mb-1.5">Default travel mode</div>
      <div className="flex items-center gap-1.5 mb-4">
        {[
          { v: 'public' as const, label: 'Public', Icon: Bus },
          { v: 'walk' as const, label: 'Walk', Icon: Footprints },
          { v: 'bike' as const, label: 'Bike', Icon: Bike },
        ].map(({ v, label, Icon }) => (
          <button key={v} type="button" onClick={() => setMode(v)}
            className={'flex-1 px-2 py-1.5 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 transition-colors ' + (globalMode === v ? 'bg-[#1B2E4B] text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}>
            <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <p className="text-xs text-[#9B928E] mb-3">Add up to {MAX_COMMUTE_LOCATIONS} places you commute to. Times update as you type.</p>
      )}

      {/* Rows */}
      <div className="flex flex-col gap-3 mb-3">
        {rows.map((row, idx) => {
          const effectiveMode = row.mode || globalMode
          const durationLabel = fmtDuration(row.result?.duration)
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

              {/* Per-row mode override */}
              <div className="flex items-center gap-1 mb-2">
                <button type="button" onClick={() => updateRow(row.id, { mode: undefined })}
                  className={'flex-1 px-1.5 py-1 rounded-md text-[10px] transition-colors ' + (row.mode === undefined ? 'bg-[#1B2E4B] text-white' : 'bg-white border border-[#E8E2DA] text-[#9B928E] hover:bg-[#F5EBE0]')}>
                  Default
                </button>
                {(['public', 'walk', 'bike'] as const).map(m => (
                  <button key={m} type="button" onClick={() => updateRow(row.id, { mode: m })}
                    className={'flex-1 px-1.5 py-1 rounded-md text-[10px] capitalize transition-colors ' + (row.mode === m ? 'bg-[#1B2E4B] text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0]')}>
                    {m}
                  </button>
                ))}
              </div>

              {/* Result line — shows duration or status */}
              {row.address.trim() ? (
                <div className="bg-[#F5EBE0] rounded-lg px-3 py-2 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#D3755A] flex-shrink-0" strokeWidth={1.75} />
                  <span className="text-xs text-[#1B2E4B] flex-1 min-w-0 truncate">
                    {row.loading
                      ? 'Calculating…'
                      : row.error
                        ? row.error
                        : durationLabel
                          ? <>{durationLabel} <span className="text-[#9B928E]">via {effectiveMode}</span></>
                          : 'No route found'}
                  </span>
                </div>
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
