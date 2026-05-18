'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  listingAId: string
  listingBId: string
  score: number
}

export default function DedupeActions({ listingAId, listingBId, score }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The "canonical" choice: by default we merge B into A (A is the canonical).
  // The two buttons differ only in which way the merge goes.
  async function doMerge(canonicalId: string, duplicateId: string) {
    if (!confirm(`Merge ${duplicateId.slice(0,8)} into ${canonicalId.slice(0,8)}? This deactivates the duplicate.`)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/dedupe/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonical_id: canonicalId, duplicate_id: duplicateId, score }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Merge failed'); setBusy(false); return }
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Merge failed'); setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => doMerge(listingAId, listingBId)}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50"
        style={{ background: '#D3755A' }}
      >
        Keep A · merge B in
      </button>
      <button
        onClick={() => doMerge(listingBId, listingAId)}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50"
        style={{ background: '#D3755A' }}
      >
        Keep B · merge A in
      </button>
      <span className="text-xs text-stone-400 ml-auto">
        (Reject = ignore for now; reappears on next audit.)
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
