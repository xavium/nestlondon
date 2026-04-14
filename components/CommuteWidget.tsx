'use client'

import { useState, useEffect } from 'react'

interface CommuteResult {
  duration: number | null
  modes: string[]
  fare: number | null
  legs: { mode: string; duration: number; summary: string }[]
}

export default function CommuteWidget({
  listingPostcode,
  listingLat,
  listingLng,
  initialCommuteAddress,
  onSaveAddress,
}: {
  listingPostcode?: string | null
  listingLat?: number | null
  listingLng?: number | null
  initialCommuteAddress?: string | null
  onSaveAddress?: (address: string) => void
}) {
  const [commuteAddress, setCommuteAddress] = useState(initialCommuteAddress || '')
  const [input, setInput] = useState(initialCommuteAddress || '')
  const [result, setResult] = useState<CommuteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Auto-calculate if we already have a commute address
  useEffect(() => {
    // Fetch latest saved commute address from profile
    fetch('/api/commute/saved')
      .then(r => r.json())
      .then(d => {
        const addr = d.commute_address || initialCommuteAddress || ''
        setInput(addr)
        if (addr && (listingPostcode || (listingLat && listingLng))) {
          calculate(addr)
        }
      })
      .catch(() => {
        if (initialCommuteAddress && (listingPostcode || (listingLat && listingLng))) {
          calculate(initialCommuteAddress)
        }
      })
  }, [])

  async function calculate(to: string) {
    const from = listingPostcode
      ? listingPostcode.replace(/\s/g, '')
      : listingLat && listingLng
        ? `${listingLat},${listingLng}`
        : null

    if (!from) { setError('Listing location not available'); return }
    if (!to.trim()) { setError('Please enter a destination'); return }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/commute?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setCommuteAddress(to)
    } catch (e: any) {
      setError('Could not calculate commute. Try a postcode or station name.')
    } finally {
      setLoading(false)
    }
  }

  async function saveAddress() {
    await fetch('/api/commute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commute_address: commuteAddress })
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaveAddress?.(commuteAddress)
  }

  const durationLabel = result?.duration
    ? result.duration < 60
      ? `${result.duration} mins`
      : `${Math.floor(result.duration / 60)}h ${result.duration % 60}m`
    : null

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'rgba(211,117,90,0.10)'}}>
          <svg className="w-4 h-4" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-[#1B2E4B]">Commute time</div>
          <div className="text-xs text-[#9B928E]">Powered by TfL</div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && calculate(input)}
          placeholder="Work postcode or station (e.g. EC1A 1BB)"
          className="flex-1 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"
        />
        <button
          onClick={() => calculate(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90 flex-shrink-0"
          style={{background:'#D3755A'}}
        >
          {loading ? '...' : 'Go'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {result && durationLabel && (
        <div>
          <div className="bg-[#F5EBE0] rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xl font-light text-[#1B2E4B]">{durationLabel}</div>
                <div className="text-xs text-[#9B928E]">to {commuteAddress}</div>
              </div>
              <div className="flex gap-1.5">
                {result.modes.slice(0, 3).map((m, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white text-[#1B2E4B] border border-[#E8E2DA] capitalize">
                    {m.includes('tube') || m.includes('elizabeth') || m.includes('dlr') || m.includes('overground') ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="10" rx="2" strokeWidth="1.5"/><path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="15" r="1" fill="currentColor"/><circle cx="16.5" cy="15" r="1" fill="currentColor"/></svg>
                    ) : m.includes('bus') ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5"/><path d="M3 10h18M8 19v2M16 19v2" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7.5" cy="15" r="1" fill="currentColor"/><circle cx="16.5" cy="15" r="1" fill="currentColor"/></svg>
                    ) : m.includes('national-rail') || m.includes('tram') ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 17l2 2h12l2-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v9z" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 19l-2 2M15 19l2 2M4 12h16" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                    {m.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            {result.fare !== null && (
              <div className="text-xs text-[#9B928E]">~£{result.fare} fare (off-peak)</div>
            )}
          </div>

          {/* Leg breakdown */}
          <div className="flex flex-col gap-1.5 mb-3">
            {result.legs.map((leg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                <span className="flex items-center gap-1 text-xs text-[#9B928E] capitalize w-20 flex-shrink-0">
                {leg.mode === 'walking' ? (
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 4a1 1 0 11-2 0 1 1 0 012 0zM7 20l2-6m4 6l1-4-3-2 1-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : leg.mode.includes('bus') ? (
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5"/><path d="M3 10h18M8 19v2M16 19v2" strokeWidth="1.5" strokeLinecap="round"/></svg>
                ) : (
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="10" rx="2" strokeWidth="1.5"/><path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2" strokeWidth="1.5" strokeLinecap="round"/></svg>
                )}
                {leg.mode.replace(/-/g, ' ')}
              </span>
                <span className="flex-1 truncate text-[#9B928E]">{leg.summary || leg.mode}</span>
                <span className="font-medium flex-shrink-0">{leg.duration} min</span>
              </div>
            ))}
          </div>

          {/* Save address */}
          {commuteAddress !== initialCommuteAddress && (
            <button onClick={saveAddress}
              className="w-full py-2 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors">
              {saved ? '✓ Saved to your profile' : 'Save this as my commute address'}
            </button>
          )}
        </div>
      )}

      {result?.duration === null && !loading && !error && (
        <p className="text-xs text-[#9B928E]">No route found. Try a different postcode or station.</p>
      )}
    </div>
  )
}
