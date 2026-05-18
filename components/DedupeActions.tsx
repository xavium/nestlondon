'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  listingAId: string
  listingBId: string
  score: number
  recommendation: { canonical: 'a' | 'b' | null; reason: string }
  /** True when this pair has been auto-hidden (canonical chosen). Buttons become Confirm/Reject. */
  alreadyAutoHidden?: boolean
}

export default function DedupeActions({ listingAId, listingBId, score, recommendation, alreadyAutoHidden }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function action(endpoint: string, payload: Record<string, any>, confirmText: string) {
    if (!confirm(confirmText)) return
    setBusy(true); setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Action failed'); setBusy(false); return }
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Action failed'); setBusy(false)
    }
  }

  // CASE 1: both-direct ambiguity — no recommendation, need admin to pick.
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
          onClick={() => action('/api/admin/dedupe/merge', { canonical_id: listingAId, duplicate_id: listingBId, score }, 'Keep A as canonical and hide B?')}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50"
        >
          Keep A
        </button>
        <button
          onClick={() => action('/api/admin/dedupe/merge', { canonical_id: listingBId, duplicate_id: listingAId, score }, 'Keep B as canonical and hide A?')}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50"
        >
          Keep B
        </button>
        {error && <span className="text-xs text-red-600 w-full">{error}</span>}
      </div>
    )
  }

  const recCanonical = recommendation.canonical === 'a' ? listingAId : listingBId
  const recDuplicate = recommendation.canonical === 'a' ? listingBId : listingAId
  const recLabel = recommendation.canonical === 'a' ? 'A' : 'B'

  // CASE 2: auto-hidden already (shouldn't appear in audit list, but defensive)
  // — show Confirm + Reject path.
  if (alreadyAutoHidden) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-stone-50 text-stone-700 border border-stone-200">
          Auto-hidden · keeping {recLabel}
        </span>
        <span className="text-xs text-stone-500">{recommendation.reason}</span>
        <button
          onClick={() => action('/api/admin/dedupe/confirm', { canonical_id: recCanonical, duplicate_id: recDuplicate }, 'Confirm this auto-merge?')}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50 ml-auto"
          style={{ background: '#D3755A' }}
        >
          Confirm
        </button>
        <button
          onClick={() => action('/api/admin/dedupe/reject', { canonical_id: recCanonical, duplicate_id: recDuplicate }, 'Reject auto-merge and restore both listings?')}
          disabled={busy}
          className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50"
        >
          Reject (restore)
        </button>
        {error && <span className="text-xs text-red-600 w-full">{error}</span>}
      </div>
    )
  }

  // CASE 3: clear recommendation, not yet auto-hidden — explicit merge button.
  // (Shouldn't happen in normal flow because audit auto-hides confident pairs first,
  // but the review-tier pairs still go through this branch.)
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => action('/api/admin/dedupe/merge', { canonical_id: recCanonical, duplicate_id: recDuplicate, score }, `Merge: keep ${recLabel}, hide the other?`)}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium text-white disabled:opacity-50"
        style={{ background: '#D3755A' }}
      >
        Merge · keep {recLabel}
      </button>
      <span className="text-xs text-stone-500">{recommendation.reason}</span>
      <button
        onClick={() => action('/api/admin/dedupe/reject', { canonical_id: recCanonical, duplicate_id: recDuplicate }, 'Reject (mark as not a duplicate)?')}
        disabled={busy}
        className="px-3 py-1.5 text-xs rounded-lg font-medium border border-[#E8E2DA] text-stone-700 hover:bg-white disabled:opacity-50 ml-auto"
      >
        Reject
      </button>
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </div>
  )
}
