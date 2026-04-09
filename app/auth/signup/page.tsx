'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { agency_name: agencyName } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#F1EFE8] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-light text-stone-800 mb-2">Check your email</h2>
          <p className="text-stone-500 text-sm">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F1EFE8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-stone-800">
            nestlondon
          </h1>
          <p className="text-stone-500 text-sm mt-2">Register your agency</p>
        </div>
        <form onSubmit={handleSignup} className="bg-white border border-stone-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm text-stone-600 mb-1.5">Agency name</label>
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-orange-600"
              placeholder="Hackney Lettings Co"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-stone-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-orange-600"
              placeholder="you@agency.co.uk"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-stone-600 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-orange-600"
              placeholder="Min. 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-orange-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-stone-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-700 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
