'use client'

import { useState, useEffect } from 'react'

export default function SaveButton({ listingId }: { listingId: string }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/saved/property')
      .then(r => r.json())
      .then(d => {
        const isSaved = d.saved?.includes(listingId)
        setSaved(isSaved)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [listingId])

  async function toggle() {
    if (loading) return
    setLoading(true)
    if (saved && savedId) {
      await fetch('/api/saved/property', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved_id: savedId })
      })
      setSaved(false)
      setSavedId(null)
    } else {
      const res = await fetch('/api/saved/property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId })
      })
      if (res.status === 401) {
        // Not logged in — redirect to signup, save will happen post-account
        const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'
        window.location.href = '/auth/signup?role=resident&save=' + encodeURIComponent(listingId) + '&next=' + encodeURIComponent(next)
        return
      }
      const d = await res.json()
      if (d.id) { setSaved(true); setSavedId(d.id) }
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading}
      title={saved ? 'Remove from saved' : 'Save property'}
      aria-label={saved ? 'Remove from saved' : 'Save property'}
      className="p-2 transition-opacity hover:opacity-70 disabled:opacity-50">
      <svg className="w-6 h-6" fill={saved ? '#D9302C' : 'none'} stroke="#D9302C" viewBox="0 0 24 24">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </button>
  )
}
