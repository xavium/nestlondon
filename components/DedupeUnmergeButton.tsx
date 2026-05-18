'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DedupeUnmergeButton({ mergeLogId }: { mergeLogId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function doUnmerge() {
    if (!confirm('Unmerge this listing? It will be reactivated and shown again in search.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/dedupe/unmerge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_log_id: mergeLogId }),
      })
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Unmerge failed'); setBusy(false); return }
      router.refresh()
    } catch (e: any) {
      alert(e?.message || 'Unmerge failed'); setBusy(false)
    }
  }

  return (
    <button
      onClick={doUnmerge}
      disabled={busy}
      className="text-xs text-[#D3755A] hover:underline disabled:opacity-50"
    >
      Unmerge
    </button>
  )
}
