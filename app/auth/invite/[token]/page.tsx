'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params?.token

  const [invitation, setInvitation] = useState<{ name: string; email: string; role: string; is_admin: boolean; agency_name: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/agency/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.invitation) setInvitation(data.invitation)
        else setLoadError(data.error || 'Invitation not found')
      })
      .catch(() => setLoadError('Could not load invitation'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/agency/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not accept invitation')
      // Sign in automatically
      const sb = createClient()
      await sb.auth.signInWithPassword({ email: invitation!.email, password })
      router.push('/dashboard')
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="text-sm text-[#9B928E]">Loading invitation…</div>
    </main>
  )

  if (loadError) return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8">
          <h1 className="text-xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Invitation unavailable</h1>
          <p className="text-sm text-[#9B928E] mb-6">{loadError}</p>
          <Link href="/" className="text-sm text-[#D3755A] hover:underline">← Back to NestLondon</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <h1 className="text-2xl font-light text-[#1B2E4B] mt-6 mb-1" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>You're invited to join {invitation!.agency_name}</h1>
          <p className="text-sm text-[#9B928E]">
            {invitation!.is_admin ? 'As an admin' : 'As a team member'}
          </p>
        </div>

        <form onSubmit={handleAccept} className="bg-white border border-[#E8E2DA] rounded-2xl p-7 flex flex-col gap-4">
          {submitError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{submitError}</div>}

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Your name</label>
            <input type="text" value={invitation!.name} disabled
              className="w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] bg-[#F5EBE0] cursor-not-allowed" />
          </div>

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Your email</label>
            <input type="email" value={invitation!.email} disabled
              className="w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] bg-[#F5EBE0] cursor-not-allowed" />
          </div>

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Set a password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters"
              className="w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
          </div>

          <button type="submit" disabled={submitting || password.length < 8}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90 mt-1"
            style={{background:'#1B2E4B'}}>
            {submitting ? 'Creating account…' : 'Accept & create account'}
          </button>
        </form>
      </div>
    </main>
  )
}
