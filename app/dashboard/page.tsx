'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      } else {
        setEmail(user.email ?? '')
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F1EFE8] flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F1EFE8] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-light text-stone-800">
            nestlondon
          </h1>
          <span className="text-sm text-stone-500">{email}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-stone-100 rounded-xl p-5">
            <div className="text-xs text-stone-400 mb-1 uppercase tracking-wide">Active listings</div>
            <div className="text-2xl text-stone-800">0</div>
          </div>
          <div className="bg-stone-100 rounded-xl p-5">
            <div className="text-xs text-stone-400 mb-1 uppercase tracking-wide">Enquiries this week</div>
            <div className="text-2xl text-stone-800">0</div>
          </div>
          <div className="bg-stone-100 rounded-xl p-5">
            <div className="text-xs text-stone-400 mb-1 uppercase tracking-wide">Total views</div>
            <div className="text-2xl text-stone-800">0</div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-stone-400 text-sm">
            No listings yet. Once your properties are added they will appear here.
          </p>
        </div>
      </div>
    </main>
  )
}
