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
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        setUserRole(user.user_metadata?.role || 'user')
        setEmail(user.email || null)
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

  const portalHref = userRole === 'owner' || userRole === 'landlord' ? '/dashboard/owner'
    : userRole === 'agent' ? '/dashboard'
    : '/account'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={"flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border transition-colors " + (variant === 'dark' ? 'border-white/30 text-white hover:bg-white/10' : 'border-[#E8E2DA] text-[#1B2E4B] hover:bg-[#F5EBE0]')}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        My account
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
          <Link href={portalHref} onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors no-underline">
            <svg className="w-4 h-4 text-[#D3755A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            My portal
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
