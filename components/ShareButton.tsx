'use client'

import { useState } from 'react'

export default function ShareButton({ address, price }: { address: string, price: number }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    const text = address + ' - £' + price?.toLocaleString() + '/mo on NestLondon'

    if (navigator.share) {
      try {
        await navigator.share({ title: address, text, url })
        return
      } catch {}
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={share}
      className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-300 transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Share
        </>
      )}
    </button>
  )
}
