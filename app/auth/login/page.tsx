'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-stone-800">
            nestlondon
          </h1>
          <p className="text-stone-500 text-sm mt-2">Agent login</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white border border-stone-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm text-stone-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-green-700"
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
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-green-700"
              placeholder="password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-900 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-stone-500 mt-4">
            No account?{' '}
            <Link href="/auth/signup" className="text-green-800 hover:underline">
              Register your agency
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
