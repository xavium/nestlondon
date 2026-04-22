'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NavAuthButton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [newMatches, setNewMatches] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        setUserRole(user.user_metadata?.role || 'user')
        setEmail(user.email || null)
        // Fetch unread message count
        fetch('/api/messages?inbox=true')
          .then(r => r.json())
          .then(d => {
            const count = (d.threads || []).reduce((n: number, t: any) => n + (t.unread || 0), 0)
            setUnread(count)
          })
          .catch(() => {})

        // Fetch new search matches count
        fetch('/api/saved/search/new-matches')
          .then(r => r.json())
          .then(d => setNewMatches(d.count || 0))
          .catch(() => {})
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) return <div className="w-20 h-8" />

  if (!userRole) {
    return (
      <Link href="/auth/login" className={"transition-colors no-underline text-sm " + (variant === 'dark' ? 'text-white/70 hover:text-white' : 'text-[#9B928E] hover:text-[#1B2E4B]')}>
        Login
      </Link>
    )
  }

  const portalHref = userRole?.startsWith('owner') || userRole === 'landlord' ? '/dashboard/owner'
    : userRole?.startsWith('agent') ? '/dashboard'
    : '/account'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={"flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border transition-colors " + (variant === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-[#E8E2DA] text-[#1B2E4B] hover:bg-[#F5EBE0]')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        My account
        {(unread + newMatches) > 0 && (
          <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center" style={{ background: '#D3755A' }}>
            {unread + newMatches}
          </span>
        )}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-[200] w-48 py-1 overflow-hidden">
          {email && (
            <div className="px-4 py-2.5 border-b border-[#E8E2DA]">
              <div className="text-xs text-[#9B928E] truncate">{email}</div>
            </div>
          )}
          {(userRole?.startsWith('owner') || userRole === 'landlord' || userRole?.startsWith('agent')) && (
            <Link href={portalHref} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
              <svg className="w-4 h-4 text-[#D3755A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {userRole?.startsWith('agent') ? 'Agent portal' : 'My portal'}
            </Link>
          )}
          <Link href="/saved" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Saved properties
          </Link>
          <Link href="/searches" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
              <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Saved searches
            {newMatches > 0 && (
              <span className="ml-auto min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center" style={{ background: '#D3755A' }}>
                {newMatches}
              </span>
            )}
          </Link>
          <Link href="/viewings" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            My viewings
          </Link>
          <Link href="/messages" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Messages
            {unread > 0 && (
              <span className="ml-auto min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center" style={{ background: '#D3755A' }}>
                {unread}
              </span>
            )}
          </Link>
          <Link href="/account" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Account
          </Link>
          <div className="border-t border-[#E8E2DA] mt-1" />
          <button onClick={signOut}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
