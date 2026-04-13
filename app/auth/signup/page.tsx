'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roleParam = searchParams.get('role') || 'resident'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const roleConfig = {
    resident: {
      title: 'Create your account',
      subtitle: 'Start saving properties and setting alerts',
      cta: 'Create account',
      color: '#D3755A',
    },
    owner: {
      title: 'List your property',
      subtitle: 'Create an account to list your home on NestLondon',
      cta: 'Create account',
      color: '#D3755A',
    },
    agent: {
      title: 'Register your agency',
      subtitle: 'Professional tools for letting agents',
      cta: 'Register agency',
      color: '#1B2E4B',
    },
  }[roleParam as 'resident' | 'owner' | 'agent'] ?? {
    title: 'Create your account',
    subtitle: '',
    cta: 'Create account',
    color: '#D3755A',
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const metadata: Record<string, string> = { role: roleParam, name }
    if (roleParam === 'agent' && agencyName) metadata.agency_name = agencyName

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mt-8 mb-4" style={{background:'rgba(211,117,90,0.12)'}}>
          <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-2xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Check your email</h2>
        <p className="text-sm text-[#9B928E]">
          We sent a confirmation link to <strong className="text-[#1B2E4B]">{email}</strong>. Click it to activate your account.
        </p>
        <Link href="/auth/login" className="inline-block mt-6 text-sm no-underline" style={{color:'#D3755A'}}>
          Back to sign in →
        </Link>
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
          <h1 className="text-2xl font-light text-[#1B2E4B] mt-6 mb-1" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>{roleConfig.title}</h1>
          <p className="text-sm text-[#9B928E]">{roleConfig.subtitle}</p>
        </div>

        <form onSubmit={handleSignup} className="bg-white border border-[#E8E2DA] rounded-2xl p-7 flex flex-col gap-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClass} placeholder="Your full name" />
          </div>

          {roleParam === 'agent' && (
            <div>
              <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Agency name</label>
              <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} required className={inputClass} placeholder="Hackney Lettings Co" />
            </div>
          )}

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} placeholder="you@email.com" />
          </div>

          <div>
            <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} placeholder="Min. 8 characters" minLength={8} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90 mt-1"
            style={{background: roleConfig.color}}>
            {loading ? 'Creating account…' : roleConfig.cta}
          </button>

          <p className="text-center text-xs text-[#9B928E]">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline" style={{color:'#D3755A'}}>Sign in</Link>
          </p>

          <p className="text-center text-xs text-[#9B928E]">
            Wrong account type?{' '}
            <Link href="/auth/register" className="underline" style={{color:'#D3755A'}}>Go back</Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
