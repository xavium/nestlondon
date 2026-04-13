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
      const { data: { user } } = await supabase.auth.getUser()
      const role = user?.user_metadata?.role
      if (role === 'owner' || role === 'landlord') {
        router.push('/dashboard/owner')
      } else if (role === 'agent') {
        router.push('/dashboard')
      } else {
        router.push('/search')
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F0EB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-[#1C2B3A]">
            nestlondon
          </h1>
          <p className="text-stone-500 text-sm mt-2">Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white border border-[#E8E2DA] rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm text-[#4A5568] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-[#E8E2DA] rounded-lg px-3 py-2.5 text-sm text-[#1C2B3A] outline-none focus:border-orange-600"
              placeholder="you@example.co.uk"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm text-[#4A5568] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-[#E8E2DA] rounded-lg px-3 py-2.5 text-sm text-[#1C2B3A] outline-none focus:border-orange-600"
              placeholder="password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-orange-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-stone-500 mt-4">
            No account?{' '}
            <Link href="/auth/register" className="text-orange-700 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
