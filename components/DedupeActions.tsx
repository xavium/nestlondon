'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  listingAId: string
  listingBId: string
  score: number
  recommendation: { canonical: 'a' | 'b' | null; reason: string }
}

export default function DedupeActions({ listingAId, listingBId, score, recommendation }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // If recommendation is null, both are direct — show a prominent "needs review" notice
  // instead of auto-merge buttons.
  if (recommendation.canonical === null) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100 mr-2">
            ⚠ Manual review needed
          </span>
          <span className="text-xs text-stone-600">{recommendation.reason}</span>
        </div>
        <button
          onClick={() => doMerge(listingAId, listingBId)}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50"
        >
          Override · keep A
        </button>
        <button
          onClick={() => doMerge(listingBId, listingAId)}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50"
        >
          Override · keep B
        </button>
        {error && <span className="text-xs text-red-600 w-full">{error}</span>}
      </div>
    )
  }

  // The recommended canonical and duplicate
  const recCanonical = recommendation.canonical === 'a' ? listingAId : listingBId
  const recDuplicate = recommendation.canonical === 'a' ? listingBId : listingAId
  const recLabel = recommendation.canonical === 'a' ? 'A' : 'B'
  const otherLabel = recommendation.canonical === 'a' ? 'B' : 'A'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => doMerge(recCanonical, recDuplicate)}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50"
        style={{ background: '#D3755A' }}
      >
        Auto-merge · keep {recLabel}
      </button>
      <span className="text-xs text-stone-500">{recommendation.reason}</span>
      <button
        onClick={() => doMerge(recDuplicate, recCanonical)}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50 ml-auto"
      >
        Override · keep {otherLabel}
      </button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </div>
  )
}
