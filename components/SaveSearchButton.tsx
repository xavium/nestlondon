'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SaveSearchButton() {
  const searchParams = useSearchParams()
  const params = Object.fromEntries(searchParams.entries())
  const paramsKey = JSON.stringify(Object.keys(params).sort().reduce((a, k) => ({ ...a, [k]: params[k] }), {}))

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Reset state when the search URL changes so a previously-saved search doesn't
    // leak its 'saved' badge onto a different search the user navigates to.
    setSaved(false)
    setLoading(true)
    let cancelled = false
    fetch('/api/saved/search/check?' + new URLSearchParams(params).toString())
      .then(r => r.json())
      .then(d => { if (!cancelled) setSaved(!!d.saved) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  async function save() {
    setLoading(true)
    const res = await fetch('/api/saved/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params })
    })
    if (res.ok) setSaved(true)
    setLoading(false)
  }

  if (loading) return <span className="w-20 h-4" />

  if (saved) return (
    <span className="flex items-center gap-2 bg-white border border-[#D3755A] rounded-md px-3 py-2 text-sm text-[#D3755A] h-11 whitespace-nowrap">
      <svg className="w-4 h-4" fill="#D3755A" stroke="#D3755A" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeWidth="1.5"/>
      </svg>
      Saved
    </span>
  )

  return (
    <button onClick={save} disabled={loading}
      className="flex items-center gap-2 bg-white border border-[#E8E2DA] rounded-md px-3 py-2 text-sm text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors h-11 whitespace-nowrap disabled:opacity-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Save
    </button>
  )
}
