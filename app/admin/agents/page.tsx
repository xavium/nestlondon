import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AgentsAdminClient from './AgentsAdminClient'

export default async function AgentsAdminPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') redirect('/')

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: agents } = await adminClient
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
          <span className="text-white/40 text-sm ml-3">Admin · Agents</span>
        </Link>
        <Link href="/admin/listings" className="text-xs text-white/60 hover:text-white no-underline">← Listings</Link>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Agent management</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>BLM Feed agents</h1>
        </div>
        <AgentsAdminClient agents={agents || []} />
      </div>
    </main>
  )
}
