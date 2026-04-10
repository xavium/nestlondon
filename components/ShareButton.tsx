'use client'

import { useState, useRef, useEffect } from 'react'

export default function ShareButton({ address, price }: { address: string, price: number }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = address + ' - £' + price?.toLocaleString() + '/mo on NestLondon'

  async function nativeShare() {
    try {
      await navigator.share({ title: address, text, url })
      setOpen(false)
    } catch {}
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 2000)
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-[#E8E2DA] rounded-lg px-3 py-1.5 hover:border-stone-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Share
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-[#E8E2DA] rounded-xl shadow-lg p-3 w-72">

          {/* Copy link row */}
          <p className="text-xs text-stone-400 mb-1.5">Copy link</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 text-xs text-[#4A5568] bg-stone-50 border border-[#E8E2DA] rounded-lg px-2.5 py-1.5 truncate">
              {url}
            </div>
            <button
              onClick={copyUrl}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
              style={{background: '#D85A30'}}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Native share — only shown if supported (mobile) */}
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <>
              <div className="border-t border-stone-100 mb-3" />
              <button
                onClick={nativeShare}
                className="w-full flex items-center gap-2 text-xs text-[#4A5568] hover:text-[#1C2B3A] py-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                More sharing options…
              </button>
            </>
          )}

        </div>
      )}
    </div>
  )
}
