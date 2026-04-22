import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAgency } from '@/lib/agency'
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
  if (role?.startsWith('owner') || role === 'landlord') redirect('/dashboard/owner')
  if (!role?.startsWith('agent') && role !== 'admin') redirect('/')

  const agencyCtx = await resolveAgency(user.id)
  if (!agencyCtx) redirect('/')
  const agencyId = agencyCtx.agencyId

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch agent record for the agency owner (not the invited member)
  let { data: agentRecord } = await svc.from('agents').select('*').eq('id', agencyId).maybeSingle()
  if (!agentRecord && agencyCtx.isOwner) {
    // Auto-create only for the agency owner on first login
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

  // Filter by specialism: _lettings sees rent listings, _sales sees buy listings
  const specialismListingType = role?.endsWith('_sales') ? 'buy' : role?.endsWith('_lettings') ? 'rent' : null

  // Fetch all listings for this agent
  let listingsQuery = svc
    .from('listings')
    .select('id, address, price, bedrooms, property_type, images, is_active, scraped_at, listed_at, borough, source, assigned_agent_id, assigned_agent_name, square_feet, latitude, longitude, postcode, listing_type')
    .eq('agent_id', agencyId)
    .order('scraped_at', { ascending: false })
  if (specialismListingType) listingsQuery = listingsQuery.eq('listing_type', specialismListingType)
  const { data: listings } = await listingsQuery

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

  // Fetch comparables and avg days on market per listing
  const comparables: Record<string, any[]> = {}
  const avgDaysOnMarket: Record<string, number | null> = {}
  for (const listing of (listings || [])) {
    // Match by borough, or fall back to postcode district (first part of postcode)
    const postcodeDistrict = listing.postcode?.split(' ')[0] || null
    let compsQuery = svc
      .from('listings')
      .select('id, price, bedrooms, square_feet, borough, scraped_at, latitude, longitude, postcode')
      .eq('is_active', true)
      .neq('id', listing.id)
      .limit(20)

    if (listing.borough) {
      compsQuery = compsQuery.eq('borough', listing.borough)
    } else if (postcodeDistrict) {
      compsQuery = compsQuery.ilike('postcode', postcodeDistrict + '%')
    }

    const { data: allAreaComps } = await compsQuery

    // Try exact bedrooms first, fall back to ±1 if not enough
    let comps = (allAreaComps || []).filter((c: any) => c.bedrooms === (listing.bedrooms || 0))
    if (comps.length < 3) comps = (allAreaComps || []).filter((c: any) => Math.abs((c.bedrooms||0) - (listing.bedrooms||0)) <= 1)
    if (comps.length < 3) comps = allAreaComps || []
    comparables[listing.id] = comps || []

    if (comps && comps.length >= 3) {
      const days = comps
        .filter(c => c.scraped_at)
        .map(c => Math.floor((Date.now() - new Date(c.scraped_at).getTime()) / 86400000))
      avgDaysOnMarket[listing.id] = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null
    } else {
      avgDaysOnMarket[listing.id] = null
    }
  }

  // Fetch agency team members
  const { data: agencyAgents } = await svc
    .from('agency_agents')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name')

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
        user={{ email: user.email!, name: user.user_metadata?.name || '', id: user.id, isAdmin: agencyCtx.isAdmin, isOwner: agencyCtx.isOwner }}
        agentRecord={agentRecord}
        agencyAgents={agencyAgents || []}
        comparables={comparables}
        avgDaysOnMarket={avgDaysOnMarket}
        listings={listings || []}
        viewingRequests={viewingRequests}
        messages={messages}
        events={events}
      />
    </main>
  )
}
