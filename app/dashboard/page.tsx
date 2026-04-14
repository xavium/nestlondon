import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import AgentDashboardClient from './AgentDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const role = user.user_metadata?.role
  if (role === 'owner' || role === 'landlord') redirect('/dashboard/owner')
  if (role !== 'agent' && role !== 'admin') redirect('/')

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch agent record — create if doesn't exist
  let { data: agentRecord } = await svc.from('agents').select('*').eq('id', user.id).maybeSingle()
  if (!agentRecord) {
    const { data: byEmail } = await svc.from('agents').select('*').eq('email', user.email!).maybeSingle()
    if (byEmail) {
      agentRecord = byEmail
    } else {
      const crypto = await import('crypto')
      const api_key = crypto.randomBytes(32).toString('hex')
      const { data: created } = await svc.from('agents').insert({
        id: user.id,
        name: user.user_metadata?.agency_name || user.user_metadata?.name || user.email,
        email: user.email,
        api_key,
        is_active: true,
      }).select('*').single()
      agentRecord = created
    }
  }

  // Fetch all listings for this agent
  const { data: listings } = await svc
    .from('listings')
    .select('id, address, price, bedrooms, property_type, images, is_active, scraped_at, listed_at, borough, source, assigned_agent_id, assigned_agent_name')
    .eq('agent_id', user.id)
    .order('scraped_at', { ascending: false })

  const ids = (listings || []).map(l => l.id)

  // Viewing requests
  let viewingRequests: any[] = []
  if (ids.length > 0) {
    const { data: vr } = await svc
      .from('viewing_requests')
      .select('*')
      .in('listing_id', ids)
      .order('created_at', { ascending: false })
    viewingRequests = vr || []
  }

  // Messages
  let messages: any[] = []
  if (ids.length > 0) {
    const { data: msgs } = await svc
      .from('messages')
      .select('id, listing_id, sender_email, content, created_at, read_at')
      .in('listing_id', ids)
      .order('created_at', { ascending: false })
    messages = msgs || []
  }

  // Events (views)
  let events: any[] = []
  if (ids.length > 0) {
    const { data: evts } = await svc
      .from('listing_events')
      .select('listing_id, event_type, created_at')
      .in('listing_id', ids)
    events = evts || []
  }

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
          <span className="text-white/40 text-sm ml-3 font-sans">Agent portal</span>
        </Link>
        <NavAuthButton variant="dark" />
      </nav>
      <AgentDashboardClient
        user={{ email: user.email!, name: user.user_metadata?.name || '', id: user.id }}
        agentRecord={agentRecord}
        listings={listings || []}
        viewingRequests={viewingRequests}
        messages={messages}
        events={events}
      />
    </main>
  )
}
