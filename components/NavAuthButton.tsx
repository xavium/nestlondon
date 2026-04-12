'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function NavAuthButton() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) {
        const role = user.user_metadata?.role || 'agent'
        setUserRole(role)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="w-20 h-8" />

  if (userRole) {
    const href = userRole === 'owner' || userRole === 'landlord' ? '/dashboard/owner' : '/dashboard'
    return (
      <Link href={href} className="text-xs px-4 py-2 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors no-underline">
        My portal
      </Link>
    )
  }

  return (
    <Link href="/auth/login" className="hover:text-white transition-colors text-white/70 no-underline text-sm">
      Login
    </Link>
  )
}
