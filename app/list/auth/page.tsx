'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ListAuthPageInner() {
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/list'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      const role = redirect.includes('landlord') ? 'landlord' : 'owner_lettings'
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, role } }
      })
      if (error) { setError(error.message); setLoading(false) }
      else setSuccess(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      else router.push(redirect)
    }
  }

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white transition-colors"

  if (success) return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{background:'rgba(211,117,90,0.12)'}}>
          <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <h2 className="text-2xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Check your email</h2>
        <p className="text-sm text-[#3D3A38] mb-6">We've sent a confirmation link to <strong>{email}</strong>. Click it to verify your account, then come back to list your property.</p>
        <button onClick={() => router.push(redirect)} className="px-6 py-3 rounded-xl text-white text-sm" style={{background:'#D3755A'}}>Continue to listing →</button>
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
          <p className="text-sm text-[#9B928E] mt-2">
            {mode === 'register' ? 'Create an account to list your property' : 'Sign in to continue listing'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-white border border-[#E8E2DA] rounded-xl p-1 mb-6">
          {(['register', 'login'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={'flex-1 py-2 text-sm rounded-lg transition-colors ' + (mode === m ? 'text-white' : 'text-[#9B928E]')}
              style={mode === m ? {background:'#D3755A'} : {}}
            >{m === 'register' ? 'Create account' : 'Sign in'}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1.5">Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} required className={inputClass} placeholder="Jane Smith" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} placeholder="jane@example.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputClass} placeholder="Min. 6 characters" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90 mt-1"
            style={{background:'#1B2E4B'}}
          >
            {loading ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-[#9B928E] mt-4">
          By continuing you agree to our terms. Your details are only used to manage your listing.
        </p>
      </div>
    </main>
  )
}

export default function ListAuthPage() {
  return <Suspense><ListAuthPageInner /></Suspense>
}
