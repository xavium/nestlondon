import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import ViewingsClient from './ViewingsClient'

export default async function ViewingsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/viewings')

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: viewings } = await svc
    .from('viewing_requests')
    .select('*, listings(id, address, price, images, property_type, bedrooms)')
    .eq('tenant_email', user.email)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton variant="dark" />
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>My viewings</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Viewing requests</h1>
        </div>
        <ViewingsClient viewings={viewings || []} />
      </div>
    </main>
  )
}
