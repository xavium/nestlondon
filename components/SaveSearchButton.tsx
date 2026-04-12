'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SaveSearchButton() {
  const searchParams = useSearchParams()
  const params = Object.fromEntries(searchParams.entries())
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

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

  if (saved) return (
    <span className="text-xs text-[#D3755A] flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/></svg>
      Search saved
    </span>
  )

  return (
    <button onClick={save} disabled={loading}
      className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex items-center gap-1 disabled:opacity-50">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {loading ? 'Saving...' : 'Save search'}
    </button>
  )
}
