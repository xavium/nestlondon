'use client'

import { useSearchParams } from 'next/navigation'

import { useState } from 'react'
import Link from 'next/link'
import ViewingsCalendarView from '@/components/ViewingsCalendarView'

interface Listing {
  id: string
  address: string
  price: number
  bedrooms: number | null
  property_type: string | null
  images: any
  is_active: boolean
  scraped_at: string
  listed_at: string | null
  borough: string | null
  source: string | null
  assigned_agent_id: string | null
  assigned_agent_name: string | null
  square_feet: number | null
  latitude: number | null
  longitude: number | null
}

interface AgencyAgent {
  id: string
  name: string
  email: string | null
  role: string
  color: string | null
}

interface Props {
  user: { email: string; name: string; id: string }
  agentRecord: any
  listings: Listing[]
  viewingRequests: any[]
  messages: any[]
  events: any[]
  agencyAgents: AgencyAgent[]
  comparables: Record<string, any[]>
  avgDaysOnMarket: Record<string, number | null>
}

function getImg(images: any): string | null {
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images || []
    return Array.isArray(arr) ? arr.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
      <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1">{label}</div>
      <div className="text-3xl font-light text-[#1B2E4B]">{value}</div>
      {sub && <div className="text-xs text-[#9B928E] mt-1">{sub}</div>}
    </div>
  )
}

const AGENT_COLORS = [
  '#D3755A', '#1B2E4B', '#5B9A8B', '#E8A87C', '#C38D9E',
  '#6C5CE7', '#00B894', '#FDCB6E', '#D63031', '#0984E3',
]

export default function AgentDashboardClient({ user, agentRecord, listings, viewingRequests, messages, events, agencyAgents: initialAgencyAgents = [], comparables = {}, avgDaysOnMarket = {} }: Props) {
  const searchParams = useSearchParams()
  const initialAgentTab = (searchParams.get('tab') as 'overview' | 'analytics' | 'listings' | 'viewings' | 'enquiries' | 'team') || 'overview'
  const [tab, setTab] = useState<'overview' | 'analytics' | 'listings' | 'viewings' | 'enquiries' | 'team'>(initialAgentTab)
  const [listingsState, setListingsState] = useState(listings)
  const [selectedListing, setSelectedListing] = useState<string | null>(null)

  // Search/filter state
  const [listingSearch, setListingSearch] = useState('')
  const [listingMinBeds, setListingMinBeds] = useState<number | null>(null)
  const [listingMaxPrice, setListingMaxPrice] = useState<number | null>(null)
  const [listingStatusFilter, setListingStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [agencyAgents, setAgencyAgents] = useState<AgencyAgent[]>(initialAgencyAgents)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentColor, setNewAgentColor] = useState<string>(AGENT_COLORS[0])
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false)
  const [invitingLoading, setInvitingLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  async function sendInvite() {
    setInviteError(null); setInviteLink(null); setInvitingLoading(true)
    try {
      const res = await fetch('/api/agency/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          is_admin: inviteIsAdmin,
          color: AGENT_COLORS.filter(c => !agencyAgents.some(a => a.color === c))[0] || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      setInviteLink(data.invite_url)
      setInviteCopied(false)
      if (data.agent) setAgencyAgents(list => [...list, data.agent])
      setInviteName(''); setInviteEmail(''); setInviteIsAdmin(false)
    } catch (err: any) {
      setInviteError(err.message || 'Something went wrong')
    }
    setInvitingLoading(false)
  }
  const [newAgentEmail, setNewAgentEmail] = useState('')
  const [addingAgent, setAddingAgent] = useState(false)

  async function addAgencyAgent() {
    if (!newAgentName.trim()) return
    if (agencyAgents.some(a => a.color === newAgentColor)) {
      alert('That color is already used by another team member. Please pick another.')
      return
    }
    setAddingAgent(true)
    const res = await fetch('/api/agency/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAgentName.trim(), email: newAgentEmail.trim() || null, color: newAgentColor })
    })
    const data = await res.json()
    if (data.agent) {
      setAgencyAgents(a => [...a, data.agent])
      setNewAgentName('')
      setNewAgentEmail('')
      setNewAgentColor(AGENT_COLORS[0])
    }
    setAddingAgent(false)
  }

  async function removeAgencyAgent(id: string) {
    if (!confirm('Remove this agent from your team?')) return
    await fetch('/api/agency/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setAgencyAgents(a => a.filter(x => x.id !== id))
  }
  const [assignName, setAssignName] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Derive unique assigned agents from listings
  const assignedAgents = Array.from(
    new Map(
      listings
        .filter(l => l.assigned_agent_name)
        .map(l => [l.assigned_agent_id || l.assigned_agent_name, l.assigned_agent_name])
    ).entries()
  ).map(([id, name]) => ({ id: id || name!, name: name! }))

  // Filter helpers
  const applyAgentFilter = (items: any[], getListingId: (i: any) => string) => {
    if (agentFilter === 'all') return items
    if (agentFilter === 'unassigned') return items.filter(i => {
      const l = listings.find(l => l.id === getListingId(i))
      return !l?.assigned_agent_id && !l?.assigned_agent_name
    })
    return items.filter(i => {
      const l = listings.find(l => l.id === getListingId(i))
      return l?.assigned_agent_id === agentFilter || l?.assigned_agent_name === agentFilter
    })
  }

  // Per-listing stats
  const listingStats = listingsState.map(l => {
    const lComps = comparables[l.id] || []
    const compPrices = lComps.map((c: any) => c.price).filter(Boolean)
    const avgCompPrice = compPrices.length ? Math.round(compPrices.reduce((a: number, b: number) => a + b, 0) / compPrices.length) : null
    const priceDiff = avgCompPrice && l.price ? Math.round((l.price - avgCompPrice) / avgCompPrice * 100) : null
    const daysListed = l.scraped_at ? Math.floor((Date.now() - new Date(l.scraped_at).getTime()) / 86400000) : 0
    const avgMktDays = avgDaysOnMarket[l.id] ?? null
    const lViews = events.filter(e => e.listing_id === l.id && e.event_type === 'view').length
    const lEnquiries = messages.filter(m => m.listing_id === l.id).length
    const lViewings = viewingRequests.filter(v => v.listing_id === l.id).length
    return {
      ...l,
      views: lViews,
      viewings: lViewings,
      enquiries: lEnquiries,
      priceDiff,
      avgCompPrice,
      daysListed,
      avgMktDays,
      comps: lComps,
      conversionRate: lViews > 0 ? Math.round(lEnquiries / lViews * 100) : 0,
      myPsqm: (l as any).square_feet && l.price ? l.price / ((l as any).square_feet * 0.0929) : null,
      compPsqms: lComps.filter((c: any) => c.square_feet && c.price).map((c: any) => c.price / (c.square_feet * 0.0929)),
    }
  })

  const filteredListingStats = listingStats.filter(l => {
    if (listingStatusFilter === 'active' && !l.is_active) return false
    if (listingStatusFilter === 'inactive' && l.is_active) return false
    if (listingSearch && !l.address?.toLowerCase().includes(listingSearch.toLowerCase())) return false
    if (listingMinBeds !== null && (l.bedrooms == null || l.bedrooms < listingMinBeds)) return false
    if (listingMaxPrice !== null && l.price > listingMaxPrice) return false
    if (agentFilter !== 'all') {
      if (agentFilter === 'unassigned' && (l.assigned_agent_id || l.assigned_agent_name)) return false
      if (agentFilter !== 'unassigned' && l.assigned_agent_id !== agentFilter && l.assigned_agent_name !== agentFilter) return false
    }
    return true
  })

  const filteredViewings = agentFilter === 'all' ? viewingRequests : applyAgentFilter(viewingRequests, v => v.listing_id)
  const filteredMessages = agentFilter === 'all' ? messages : applyAgentFilter(messages, m => m.listing_id)

  const activeListings = listingsState.filter(l => l.is_active)
  const totalViews = events.filter(e => e.event_type === 'view').length
  const thisWeekViews = events.filter(e => e.event_type === 'view' && new Date(e.created_at) > new Date(Date.now() - 7 * 86400000)).length
  const pendingViewings = filteredViewings.filter(v => v.status === 'pending').length
  const confirmedViewings = filteredViewings.filter(v => v.status === 'confirmed').length
  const unreadMessages = filteredMessages.filter(m => !m.read_at).length
  const thisWeekEnquiries = filteredMessages.filter(m => new Date(m.created_at) > new Date(Date.now() - 7 * 86400000)).length

  async function manageListing(listing_id: string, action: 'deactivate' | 'activate' | 'delete') {
    if (action === 'delete' && !confirm('Permanently delete this listing? This cannot be undone.')) return
    await fetch('/api/listings/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id, action })
    })
    window.location.reload()
  }

  async function assignAgent(listing_id: string) {
    setAssigning(true)
    await fetch('/api/listings/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id, action: 'assign', assigned_agent_name: assignName.trim() || null })
    })
    // Update locally without reload
    setListingsState(ls => ls.map(l => l.id === listing_id ? { ...l, assigned_agent_name: assignName.trim() || null } : l))
    setAssigningId(null)
    setAssignName('')
    setAssigning(false)
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'listings', label: `Listings (${activeListings.length})` },
    { key: 'viewings', label: `Viewings (${pendingViewings + confirmedViewings})` },
    { key: 'enquiries', label: `Enquiries (${filteredMessages.length})` },
    { key: 'team', label: `Team (${agencyAgents.length})` },
  ]

  // Agent filter pill component
  const AgentFilterBar = () => (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-4 mb-4 flex flex-wrap gap-2 items-center">
      <span className="text-xs font-medium text-[#9B928E] uppercase tracking-wide mr-1">Agent:</span>
      <button onClick={() => setAgentFilter('all')}
        className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (agentFilter === 'all' ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
        style={agentFilter === 'all' ? {background:'#1B2E4B'} : {}}>
        All
      </button>
      {assignedAgents.map(a => (
        <button key={a.id} onClick={() => setAgentFilter(a.id)}
          className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (agentFilter === a.id ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
          style={agentFilter === a.id ? {background:'#D3755A'} : {}}>
          {a.name}
        </button>
      ))}
      <button onClick={() => setAgentFilter('unassigned')}
        className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (agentFilter === 'unassigned' ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
        style={agentFilter === 'unassigned' ? {background:'#9B928E'} : {}}>
        Unassigned
      </button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          {(() => {
            const hr = new Date().getHours()
            const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
            const name = agentRecord?.name || user.name || 'there'
            return (
              <>
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Agent portal</p>
                <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>
                  {greeting}, {name}
                </h1>
                <p className="text-sm text-[#9B928E] mt-1">{user.email}</p>
              </>
            )
          })()}
        </div>
        <Link href="/list/agent"
          className="px-5 py-2.5 rounded-xl text-white text-sm font-medium no-underline transition-opacity hover:opacity-90"
          style={{ background: '#D3755A' }}>
          + Add listing
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (tab === t.key ? 'text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38]')}
            style={tab === t.key ? { background: '#1B2E4B' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Analytics */}
      {tab === 'analytics' && (() => {
        // Views last 14 days
        const last14 = Array.from({length: 14}, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - 13 + i)
          const dayStr = d.toISOString().split('T')[0]
          return {
            label: d.toLocaleDateString('en-GB', {day:'numeric',month:'short'}),
            views: events.filter(e => e.event_type === 'view' && e.created_at?.startsWith(dayStr)).length,
            enquiries: messages.filter(m => m.created_at?.startsWith(dayStr)).length,
          }
        })
        const maxDay = Math.max(...last14.map(d => d.views), 1)

        // Borough breakdown
        const boroughMap: Record<string, number> = {}
        listingsState.forEach(l => {
          const b = l.borough || 'Unknown'
          boroughMap[b] = (boroughMap[b] || 0) + 1
        })
        const boroughs = Object.entries(boroughMap).sort((a,b) => b[1]-a[1]).slice(0, 6)
        const maxBorough = Math.max(...boroughs.map(b => b[1]), 1)

        // Price brackets
        const brackets = [
          { label: '<£1,500', min: 0, max: 1500 },
          { label: '£1.5-2k', min: 1500, max: 2000 },
          { label: '£2-3k', min: 2000, max: 3000 },
          { label: '£3-5k', min: 3000, max: 5000 },
          { label: '£5k+', min: 5000, max: Infinity },
        ].map(b => ({...b, count: listingsState.filter(l => l.price >= b.min && l.price < b.max).length}))
        const maxBracket = Math.max(...brackets.map(b => b.count), 1)

        // Conversion funnel
        const totalViews2 = events.filter(e => e.event_type === 'view').length
        const totalEnquiries = messages.length
        const totalViewings2 = viewingRequests.length
        const totalConfirmed = viewingRequests.filter(v => v.status === 'confirmed').length
        const funnelSteps = [
          { label: 'Views', value: totalViews2, pct: 100 },
          { label: 'Enquiries', value: totalEnquiries, pct: totalViews2 ? Math.round(totalEnquiries/totalViews2*100) : 0 },
          { label: 'Viewings', value: totalViewings2, pct: totalEnquiries ? Math.round(totalViewings2/totalEnquiries*100) : 0 },
          { label: 'Confirmed', value: totalConfirmed, pct: totalViewings2 ? Math.round(totalConfirmed/totalViewings2*100) : 0 },
        ]

        // Top/bottom performers by view-to-enquiry ratio
        const performers = listingStats.filter(l => l.views > 0).map(l => ({
          ...l, ratio: l.enquiries / l.views * 100
        })).sort((a,b) => b.ratio - a.ratio)

        // Avg days on market (listings older than 7 days)
        const daysOnMarket = listingsState.filter(l => l.scraped_at).map(l => {
          const days = Math.floor((Date.now() - new Date(l.scraped_at).getTime()) / 86400000)
          return days
        })
        const avgDays = daysOnMarket.length ? Math.round(daysOnMarket.reduce((a,b)=>a+b,0)/daysOnMarket.length) : 0
        const avgPrice = listingsState.length ? Math.round(listingsState.reduce((a,l)=>a+l.price,0)/listingsState.length) : 0

        return (
          <div className="flex flex-col gap-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Avg listing price" value={'£' + avgPrice.toLocaleString()} sub="per month" />
              <StatCard label="Avg days listed" value={avgDays} sub="across portfolio" />
              <StatCard label="View → Enquiry" value={totalViews2 ? Math.round(totalEnquiries/totalViews2*100)+'%' : '—'} sub="conversion rate" />
              <StatCard label="Enquiry → Viewing" value={totalEnquiries ? Math.round(totalViewings2/totalEnquiries*100)+'%' : '—'} sub="conversion rate" />
            </div>

            {/* Views trend */}
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Views & enquiries — last 14 days</h2>
              <div className="flex items-end gap-1 h-24">
                {last14.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col-reverse gap-0.5">
                      <div className="w-full rounded-t" style={{height: Math.max(2, d.views/maxDay*80) + 'px', background:'#D3755A', opacity: 0.8}} title={d.views + ' views'} />
                      {d.enquiries > 0 && <div className="w-full rounded-t" style={{height: Math.max(2, d.enquiries/maxDay*80) + 'px', background:'#1B2E4B'}} title={d.enquiries + ' enquiries'} />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-1 mt-1">
                {last14.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-[#9B928E]">{i % 2 === 0 ? d.label.split(' ')[0] : ''}</div>
                ))}
              </div>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-[#9B928E]"><div className="w-3 h-3 rounded" style={{background:'#D3755A'}}/>Views</div>
                <div className="flex items-center gap-1.5 text-xs text-[#9B928E]"><div className="w-3 h-3 rounded" style={{background:'#1B2E4B'}}/>Enquiries</div>
              </div>
            </div>

            {/* Conversion funnel */}
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Conversion funnel</h2>
              <div className="flex flex-col gap-2">
                {funnelSteps.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-[#9B928E] text-right flex-shrink-0">{s.label}</div>
                    <div className="flex-1 bg-[#F5EBE0] rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full flex items-center px-3" style={{width: s.pct + '%', minWidth: '2rem', background: i === 0 ? '#D3755A' : i === 1 ? '#E8956A' : i === 2 ? '#1B2E4B' : '#2D4A7A', transition:'width 0.5s ease'}}>
                        <span className="text-xs text-white font-medium">{s.value.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-10 text-xs text-[#9B928E] flex-shrink-0">{i > 0 ? s.pct + '%' : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Borough breakdown */}
              <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Listings by area</h2>
                {boroughs.length === 0 ? <p className="text-xs text-[#9B928E]">No data yet</p> : (
                  <div className="flex flex-col gap-2">
                    {boroughs.map(([name, count]) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-[#9B928E] truncate flex-shrink-0">{name}</div>
                        <div className="flex-1 bg-[#F5EBE0] rounded-full h-4 overflow-hidden">
                          <div className="h-full rounded-full" style={{width: count/maxBorough*100+'%', background:'#D3755A', opacity:0.7}} />
                        </div>
                        <div className="w-6 text-xs text-[#1B2E4B] font-medium text-right">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price distribution */}
              <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Price distribution</h2>
                <div className="flex flex-col gap-2">
                  {brackets.map(b => (
                    <div key={b.label} className="flex items-center gap-3">
                      <div className="w-16 text-xs text-[#9B928E] flex-shrink-0">{b.label}</div>
                      <div className="flex-1 bg-[#F5EBE0] rounded-full h-4 overflow-hidden">
                        <div className="h-full rounded-full" style={{width: b.count/maxBracket*100+'%', background:'#1B2E4B', opacity:0.7}} />
                      </div>
                      <div className="w-6 text-xs text-[#1B2E4B] font-medium text-right">{b.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top performers */}
            {performers.length > 0 && (
              <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Performance — view to enquiry rate</h2>
                <div className="flex flex-col gap-2">
                  {performers.slice(0, 8).map((l, i) => (
                    <div key={l.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F5F0EB] transition-colors">
                      <div className="w-5 text-xs text-[#9B928E] text-right flex-shrink-0">#{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#1B2E4B] truncate">{l.address}</div>
                        <div className="text-[10px] text-[#9B928E]">{l.views} views · {l.enquiries} enquiries</div>
                      </div>
                      <div className="text-xs font-semibold flex-shrink-0" style={{color: l.ratio > 10 ? '#16a34a' : l.ratio > 5 ? '#D3755A' : '#9B928E'}}>
                        {l.ratio.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day/time heatmap */}
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">When do people view? (last 30 days)</h2>
              {(() => {
                const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                const hours = [8,10,12,14,16,18,20]
                const heatmap: Record<string,number> = {}
                const cutoff = new Date(Date.now() - 30*86400000)
                events.filter(e => e.event_type === 'view' && new Date(e.created_at) > cutoff).forEach(e => {
                  const d = new Date(e.created_at)
                  const dayIdx = (d.getDay() + 6) % 7 // Mon=0
                  const hour = d.getHours()
                  const key = dayIdx + '-' + hour
                  heatmap[key] = (heatmap[key] || 0) + 1
                })
                const maxHeat = Math.max(...Object.values(heatmap), 1)
                return (
                  <div>
                    <div className="flex gap-1 mb-1 ml-10">
                      {hours.map(h => <div key={h} className="flex-1 text-[10px] text-[#9B928E] text-center">{h}:00</div>)}
                    </div>
                    {days.map((day, di) => (
                      <div key={day} className="flex items-center gap-1 mb-1">
                        <div className="w-9 text-[10px] text-[#9B928E] text-right flex-shrink-0">{day}</div>
                        {hours.map(h => {
                          const val = heatmap[di + '-' + h] || 0
                          const intensity = val / maxHeat
                          return (
                            <div key={h} className="flex-1 h-6 rounded" title={val + ' views'}
                              style={{background: val === 0 ? '#F5EBE0' : `rgba(211,117,90,${0.2 + intensity * 0.8})`}} />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Save rate */}
            {events.filter(e => e.event_type === 'save').length > 0 && (
              <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Save rate by listing</h2>
                <div className="flex flex-col gap-2">
                  {listingStats.filter(l => l.views > 0).sort((a,b) => {
                    const aSaves = events.filter(e=>e.listing_id===a.id&&e.event_type==='save').length
                    const bSaves = events.filter(e=>e.listing_id===b.id&&e.event_type==='save').length
                    return (bSaves/b.views) - (aSaves/a.views)
                  }).slice(0,6).map(l => {
                    const saves = events.filter(e=>e.listing_id===l.id&&e.event_type==='save').length
                    const rate = l.views > 0 ? Math.round(saves/l.views*100) : 0
                    return (
                      <div key={l.id} className="flex items-center gap-3">
                        <div className="flex-1 text-xs text-[#1B2E4B] truncate">{l.address}</div>
                        <div className="w-24 bg-[#F5EBE0] rounded-full h-3 overflow-hidden">
                          <div className="h-full rounded-full" style={{width: Math.min(rate*5,100)+'%', background:'#D3755A'}} />
                        </div>
                        <div className="text-xs font-medium text-[#1B2E4B] w-10 text-right">{saves} ♡</div>
                        <div className="text-xs text-[#9B928E] w-10 text-right">{rate}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actionable alerts */}
            {(() => {
              const alerts: {type: 'warning'|'info', text: string}[] = []
              listingStats.forEach(l => {
                if (l.views > 10 && l.conversionRate === 0) alerts.push({type:'warning', text: `${l.address}: ${l.views} views but no enquiries — check photos and description`})
                if (l.daysListed > 30 && l.views < 5) alerts.push({type:'warning', text: `${l.address}: only ${l.views} views in ${l.daysListed} days — consider relisting`})
                if (l.priceDiff !== null && l.priceDiff > 20) alerts.push({type:'warning', text: `${l.address}: priced ${l.priceDiff}% above area average`})
                if (l.viewings > 3 && l.enquiries > 0 && l.viewings / l.enquiries > 5) alerts.push({type:'info', text: `${l.address}: high enquiries but low viewing conversion — check your availability`})
                const daysSinceNew = l.scraped_at ? Math.floor((Date.now()-new Date(l.scraped_at).getTime())/86400000) : 99
                const recentViews = events.filter(e=>e.listing_id===l.id&&e.event_type==='view'&&new Date(e.created_at)>new Date(Date.now()-7*86400000)).length
                if (daysSinceNew <= 7 && recentViews < 3) alerts.push({type:'info', text: `${l.address}: new listing getting few views — consider boosting with better photos`})
              })
              if (alerts.length === 0) return null
              return (
                <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                  <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Actionable insights</h2>
                  <div className="flex flex-col gap-2">
                    {alerts.slice(0,8).map((a,i) => (
                      <div key={i} className={'flex items-start gap-3 p-3 rounded-xl text-xs ' + (a.type==='warning' ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-blue-50 border border-blue-200 text-blue-800')}>
                        <span className="flex-shrink-0">{a.type==='warning' ? '⚠' : 'ℹ'}</span>
                        <span>{a.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          {assignedAgents.length > 0 && <AgentFilterBar />}

          {/* Portfolio revenue banner */}
          {activeListings.length > 0 && (() => {
            const totalRevenue = activeListings.reduce((s,l) => s + (l.price||0), 0)
            const vacantRevenue = listingsState.filter(l => !l.is_active).reduce((s,l) => s + (l.price||0), 0)
            const avgConversion = listingStats.length ? Math.round(listingStats.reduce((s,l) => s + l.conversionRate, 0) / listingStats.length) : 0
            return (
              <div className="bg-[#1B2E4B] rounded-2xl p-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Portfolio value</div>
                  <div className="text-2xl font-light text-white">£{totalRevenue.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-0.5">per month</div>
                </div>
                <div>
                  <div className="text-xs text-white/60 uppercase tracking-wide mb-1">Avg conversion</div>
                  <div className="text-2xl font-light text-white">{avgConversion}%</div>
                  <div className="text-xs text-white/50 mt-0.5">view to enquiry</div>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Active listings" value={activeListings.length} sub={`${listings.length} total`} />
            <StatCard label="Total views" value={totalViews} sub={`${thisWeekViews} this week`} />
            <StatCard label="Pending viewings" value={pendingViewings} sub={`${confirmedViewings} confirmed`} />
            <StatCard label="Enquiries" value={filteredMessages.length} sub={`${unreadMessages} unread · ${thisWeekEnquiries} this week`} />
          </div>

          {/* Top performing listings */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Top listings by views</h2>
            {listingStats.length === 0 ? (
              <p className="text-sm text-[#9B928E]">No listings yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...listingStats].sort((a, b) => b.views - a.views).slice(0, 5).map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#F0EBE5]">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5EBE0] flex-shrink-0">
                      {getImg(l.images) ? <img src={getImg(l.images)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                      <div className="text-xs text-[#9B928E]">£{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'}</div>
                      {l.assigned_agent_name && <div className="text-xs text-[#D3755A]">{l.assigned_agent_name}</div>}
                    </div>
                    <div className="flex gap-4 text-xs text-[#9B928E] flex-shrink-0">
                      <div className="text-center"><div className="font-semibold text-[#1B2E4B]">{l.views}</div><div>views</div></div>
                      <div className="text-center"><div className="font-semibold text-[#1B2E4B]">{l.viewings}</div><div>viewings</div></div>
                      <div className="text-center"><div className="font-semibold text-[#1B2E4B]">{l.enquiries}</div><div>enquiries</div></div>
                    </div>
                    <Link href={'/listings/' + l.id} target="_blank" className="text-xs text-[#D3755A] hover:underline no-underline flex-shrink-0">View →</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filteredMessages.length > 0 && (
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Recent enquiries</h2>
              <div className="flex flex-col gap-2">
                {filteredMessages.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#F0EBE5]">
                    <div className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + (!m.read_at ? 'bg-[#D3755A]' : 'bg-[#E8E2DA]')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#1B2E4B]">{m.sender_email}</div>
                      <div className="text-xs text-[#9B928E] truncate">{m.content}</div>
                    </div>
                    <div className="text-xs text-[#9B928E] flex-shrink-0">
                      {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listings */}
      {tab === 'listings' && (
        <div className="flex flex-col gap-4">
          {assignedAgents.length > 0 && <AgentFilterBar />}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-4 flex flex-wrap gap-3 items-center">
            <input value={listingSearch} onChange={e => setListingSearch(e.target.value)}
              placeholder="Search by address..."
              className="flex-1 min-w-48 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D3755A] bg-[#F5EBE0] text-[#1B2E4B]"
            />
            <select value={listingMinBeds ?? ''} onChange={e => setListingMinBeds(e.target.value ? parseInt(e.target.value) : null)}
              className="border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm text-[#3D3A38] bg-white outline-none focus:border-[#D3755A]">
              <option value="">Any beds</option>
              <option value="0">Studio</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+ bed</option>)}
            </select>
            <input type="number" value={listingMaxPrice ?? ''} onChange={e => setListingMaxPrice(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Max £/mo" className="w-28 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-[#D3755A] text-[#3D3A38]"
            />
            <div className="flex gap-1">
              {(['all','active','inactive'] as const).map(s => (
                <button key={s} onClick={() => setListingStatusFilter(s)}
                  className={'text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ' + (listingStatusFilter === s ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A]')}
                  style={listingStatusFilter === s ? {background:'#1B2E4B'} : {}}>
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#9B928E]">{filteredListingStats.length} of {listingsState.length}</span>
          </div>
          {filteredListingStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E] mb-4">No listings match.</p>
              <Link href="/list/agent" className="px-5 py-2.5 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Add a listing →</Link>
            </div>
          ) : filteredListingStats.map(l => {
            const isSelected = selectedListing === l.id
            const lEvents = events.filter(e => e.listing_id === l.id)
            const viewsByDay = Array.from({length:7}, (_,i) => {
              const d = new Date(); d.setDate(d.getDate()-6+i)
              const ds = d.toISOString().split('T')[0]
              return { day: d.toLocaleDateString('en-GB',{weekday:'short'}), views: lEvents.filter(e=>e.event_type==='view'&&e.created_at?.startsWith(ds)).length }
            })
            const maxV = Math.max(...viewsByDay.map(d=>d.views),1)
            const daysListed = l.scraped_at ? Math.floor((Date.now()-new Date(l.scraped_at).getTime())/86400000) : 0
            const lViewingReqs = viewingRequests.filter(v=>v.listing_id===l.id)
            return (
              <div key={l.id} className={'bg-white border rounded-2xl overflow-hidden ' + (isSelected ? 'border-[#D3755A] shadow-md' : 'border-[#E8E2DA]')}>
                <div className="p-5 flex gap-4">
                  <button className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5EBE0] flex-shrink-0 cursor-pointer" onClick={() => setSelectedListing(isSelected ? null : l.id)}>
                    {getImg(l.images) ? <img src={getImg(l.images)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : null}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedListing(isSelected ? null : l.id)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                      <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' + (l.is_active ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500')}>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-[#9B928E] mb-2">£{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}</div>
                    <div className="flex gap-3 text-xs">
                      <span><span className="font-semibold text-[#1B2E4B]">{l.views}</span> <span className="text-[#9B928E]">views</span></span>
                      <span><span className="font-semibold text-[#1B2E4B]">{l.viewings}</span> <span className="text-[#9B928E]">viewings</span></span>
                      <span><span className="font-semibold text-[#1B2E4B]">{l.enquiries}</span> <span className="text-[#9B928E]">enquiries</span></span>
                    </div>
                    {l.assigned_agent_name && <div className="text-xs text-[#D3755A] mt-1">{l.assigned_agent_name}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Link href={'/listings/' + l.id} target="_blank"
                      className="text-xs px-3 py-1.5 rounded-xl border border-[#E8E2DA] text-[#3D3A38] no-underline hover:bg-[#F5EBE0] transition-colors text-center">
                      View →
                    </Link>
                    <button onClick={() => manageListing(l.id, l.is_active ? 'deactivate' : 'activate')}
                      className={'text-xs px-3 py-1.5 rounded-xl border transition-colors ' + (l.is_active ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-green-200 text-green-600 hover:bg-green-50')}>
                      {l.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedListing(l.id); setAssigningId(l.id); setAssignName(l.assigned_agent_name || '') }}
                      className="text-xs px-3 py-1.5 rounded-xl border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0] transition-colors">
                      {l.assigned_agent_name ? 'Reassign' : 'Assign agent'}
                    </button>
                    {!l.is_active && (
                      <button onClick={() => manageListing(l.id, 'delete')}
                        className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {/* Expanded analytics */}
                {isSelected && (
                  <div className="border-t border-[#F5F0EB] p-5 bg-[#FAFAF9] flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total views', value: l.views, sub: 'all time' },
                        { label: 'Enquiries', value: l.enquiries, sub: l.views ? Math.round(l.enquiries/l.views*100)+'% rate' : '—' },
                        { label: 'Viewings', value: l.viewings, sub: lViewingReqs.filter(v=>v.status==='confirmed').length + ' confirmed' },
                        { label: 'Days listed', value: daysListed, sub: l.is_active ? 'currently live' : 'inactive' },
                      ].map(s => (
                        <div key={s.label} className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                          <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">{s.label}</div>
                          <div className="text-2xl font-light text-[#1B2E4B]">{s.value}</div>
                          <div className="text-xs text-[#9B928E] mt-0.5">{s.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-3">Views — last 7 days</h3>
                      <div className="flex items-end gap-2 h-24">
                        {viewsByDay.map((d,i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                            <div className="w-full rounded-t transition-all group-hover:ring-2 group-hover:ring-[#D3755A] group-hover:ring-offset-1" style={{height: Math.max(d.views/maxV*48, d.views>0?3:0)+'px', background: d.views>0?'#D3755A':'#E8E2DA'}} />
                            <span className="text-[10px] text-[#9B928E] group-hover:text-[#1B2E4B]">{d.day}</span>
                            <span className="text-[10px] font-medium text-[#1B2E4B] opacity-0 group-hover:opacity-100 transition-opacity h-3 whitespace-nowrap">{d.views} view{d.views === 1 ? '' : 's'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lViewingReqs.length > 0 && (
                      <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-3">Viewing requests</h3>
                        <div className="flex flex-col gap-2">
                          {lViewingReqs.slice(0,5).map(v => (
                            <div key={v.id} className="flex items-center gap-3 text-xs">
                              <span className={'px-2 py-0.5 rounded-full ' + (v.status==='confirmed'?'bg-green-50 text-green-700':v.status==='pending'?'bg-amber-50 text-amber-700':'bg-stone-100 text-stone-500')}>
                                {v.status}
                              </span>
                              <span className="text-[#1B2E4B] font-medium">{v.tenant_name}</span>
                              <span className="text-[#9B928E] truncate">{v.tenant_email}</span>
                              {v.proposed_slot && <span className="text-[#9B928E] ml-auto flex-shrink-0">{v.proposed_slot.date}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Pricing analysis */}
                    {l.comps && l.comps.length >= 3 && (
                      <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-3">Pricing analysis</h3>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                            <div className="text-xs text-[#9B928E] mb-1">Your price</div>
                            <div className="text-lg font-medium text-[#1B2E4B]">£{l.price?.toLocaleString()}</div>
                          </div>
                          <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                            <div className="text-xs text-[#9B928E] mb-1">Area avg</div>
                            <div className="text-lg font-medium text-[#1B2E4B]">£{l.avgCompPrice?.toLocaleString() || '—'}</div>
                          </div>
                          <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                            <div className="text-xs text-[#9B928E] mb-1">vs market</div>
                            <div className={'text-lg font-medium ' + (l.priceDiff === null ? 'text-[#9B928E]' : l.priceDiff > 10 ? 'text-red-500' : l.priceDiff < -10 ? 'text-green-600' : 'text-[#D3755A]')}>
                              {l.priceDiff !== null ? (l.priceDiff > 0 ? '+' : '') + l.priceDiff + '%' : '—'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-[#9B928E] flex-shrink-0">Days on market:</div>
                          <div className="flex-1 bg-[#F5EBE0] rounded-full h-2 relative">
                            {l.avgMktDays && <div className="absolute inset-y-0 left-0 rounded-full" style={{width: Math.min(l.daysListed/Math.max(l.avgMktDays*2,1)*100,100)+'%', background: l.daysListed > (l.avgMktDays||0) ? '#ef4444' : '#D3755A'}} />}
                          </div>
                          <div className="text-xs text-[#1B2E4B] font-medium flex-shrink-0">{l.daysListed}d {l.avgMktDays ? '(avg ' + l.avgMktDays + 'd)' : ''}</div>
                        </div>
                        {l.priceDiff !== null && l.priceDiff > 15 && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                            ⚠ Priced {l.priceDiff}% above area average — consider reviewing your price to improve enquiry rate
                          </div>
                        )}
                        {l.conversionRate === 0 && l.views > 10 && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                            ⚠ {l.views} views but no enquiries — review photos and listing description
                          </div>
                        )}
                        {l.daysListed > 0 && l.avgMktDays && l.daysListed > l.avgMktDays * 1.5 && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                            ⚠ Listed {l.daysListed - l.avgMktDays} days longer than similar properties — consider a price adjustment
                          </div>
                        )}
                      </div>
                    )}

                    {/* £/sqm analysis */}
                    {l.myPsqm && l.compPsqms && l.compPsqms.length >= 2 && (() => {
                      const myPsqm = l.myPsqm as number
                      const avgCompPsqm = l.compPsqms.reduce((a: number, b: number) => a + b, 0) / l.compPsqms.length
                      const psqmDiff = Math.round((myPsqm - avgCompPsqm) / avgCompPsqm * 100)
                      // Percentile: share of comparables priced at or below user's £/sqm
                      const belowOrEq = l.compPsqms.filter((p: number) => p <= myPsqm).length
                      const myPct = Math.round((belowOrEq / l.compPsqms.length) * 100)
                      const pctLabel = myPct === 0 ? 'Cheapest in area' : myPct === 100 ? 'Most expensive in area' : `${myPct}th percentile — priced at or above ${myPct}% of comparables`
                      return (
                        <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                          <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-3">£/sqm analysis</h3>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                              <div className="text-xs text-[#9B928E] mb-1">Your £/sqm</div>
                              <div className="text-lg font-medium text-[#1B2E4B]">£{l.myPsqm.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                              <div className="text-xs text-[#9B928E] mb-1">Area avg</div>
                              <div className="text-lg font-medium text-[#1B2E4B]">£{avgCompPsqm.toFixed(2)}</div>
                            </div>
                            <div className="bg-[#F5EBE0] rounded-xl p-3 text-center">
                              <div className="text-xs text-[#9B928E] mb-1">vs market</div>
                              <div className={'text-lg font-medium ' + (psqmDiff > 10 ? 'text-red-500' : psqmDiff < -10 ? 'text-green-600' : 'text-[#D3755A]')}>
                                {psqmDiff > 0 ? '+' : ''}{psqmDiff}%
                              </div>
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="flex justify-between text-[10px] text-[#9B928E] mb-1">
                              <span>Cheapest</span><span>Most expensive</span>
                            </div>
                            <div className="relative h-3 bg-[#F5EBE0] rounded-full">
                              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
                                style={{left: `calc(${Math.min(Math.max(myPct,2),98)}% - 6px)`, background:'#D3755A'}} />
                            </div>
                            <div className="text-[10px] text-[#9B928E] text-center mt-1">{pctLabel}</div>
                          </div>
                          {l.square_feet && <div className="text-xs text-[#9B928E] text-center">{l.square_feet} sq ft · {Math.round(l.square_feet * 0.0929)} sqm</div>}
                        </div>
                      )
                    })()}

                    <div className="bg-white border border-[#E8E2DA] rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Assigned agent</h3>
                      {assigningId === l.id ? (
                        <div className="flex gap-2 items-center">
                          <select value={assignName} onChange={e => setAssignName(e.target.value)}
                            className="flex-1 border border-[#D3755A] rounded-lg px-2 py-1 text-xs outline-none bg-white">
                            <option value="">Unassigned</option>
                            {agencyAgents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                          </select>
                          <button onClick={() => assignAgent(l.id)} disabled={assigning}
                            className="text-xs px-2 py-1 rounded-lg text-white disabled:opacity-50" style={{background:'#D3755A'}}>Save</button>
                          <button onClick={() => setAssigningId(null)} className="text-xs px-2 py-1 rounded-lg border border-[#E8E2DA] text-[#9B928E]">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setAssigningId(l.id); setAssignName(l.assigned_agent_name || '') }}
                          className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          {l.assigned_agent_name || 'Assign agent'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Viewings */}
      {tab === 'viewings' && (
        <div className="flex flex-col gap-4">
          {assignedAgents.length > 0 && <AgentFilterBar />}
          <ViewingsCalendarView viewings={filteredViewings.map((v: any) => {
            const l = listingsState.find(x => x.id === v.listing_id)
            const agent = l?.assigned_agent_name ? agencyAgents.find(a => a.name === l.assigned_agent_name) : null
            return {
              id: v.id,
              listing_id: v.listing_id,
              status: v.status,
              proposed_slot: v.proposed_slot,
              assigned_agent_name: l?.assigned_agent_name || null,
              agent_color: agent?.color || null,
              listings: l ? { address: l.address, price: l.price, bedrooms: l.bedrooms, property_type: l.property_type } : null
            }
          })} />
          {filteredViewings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E]">No viewing requests.</p>
            </div>
          ) : filteredViewings.map(v => {
            const listing = listingsState.find(l => l.id === v.listing_id)
            const STATUS: Record<string, string> = { pending: 'bg-amber-50 text-amber-700', proposed: 'bg-blue-50 text-blue-700', confirmed: 'bg-green-50 text-green-700', cancelled: 'bg-stone-100 text-stone-500' }
            return (
              <div key={v.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-medium text-[#1B2E4B]">{v.tenant_name}</div>
                    <div className="text-xs text-[#9B928E]">{v.tenant_email}</div>
                    {listing && <div className="text-xs text-[#9B928E] mt-1">{listing.address}</div>}
                    {listing?.assigned_agent_name && <div className="text-xs text-[#D3755A]">{listing.assigned_agent_name}</div>}
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded-full ' + (STATUS[v.status] || '')}>{v.status}</span>
                </div>
                {v.proposed_slot && (
                  <div className="bg-[#F5EBE0] rounded-xl px-3 py-2 text-xs text-[#1B2E4B]">
                    {new Date(v.proposed_slot.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at {v.proposed_slot.time}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Enquiries */}
      {tab === 'enquiries' && (
        <div className="flex flex-col gap-3">
          {assignedAgents.length > 0 && <AgentFilterBar />}
          {filteredMessages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E]">No enquiries yet.</p>
            </div>
          ) : filteredMessages.map(m => {
            const listing = listingsState.find(l => l.id === m.listing_id)
            return (
              <div key={m.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-4 flex gap-3">
                <div className={'w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ' + (!m.read_at ? 'bg-[#D3755A]' : 'bg-[#E8E2DA]')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-sm font-medium text-[#1B2E4B]">{m.sender_email}</div>
                    <div className="text-xs text-[#9B928E] flex-shrink-0">
                      {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {listing && <div className="text-xs text-[#9B928E] mb-1">{listing.address}{listing.assigned_agent_name ? ' · ' + listing.assigned_agent_name : ''}</div>}
                  <div className="text-xs text-[#3D3A38]">{m.content}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Team */}
      {tab === 'team' && (
        <div className="flex flex-col gap-5">
          {/* Add agent */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Add team member</h2>
            <div className="flex gap-3 flex-wrap">
              <input value={newAgentName} onChange={e => setNewAgentName(e.target.value)}
                placeholder="Full name" onKeyDown={e => e.key === 'Enter' && addAgencyAgent()}
                className="flex-1 border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
              <input value={newAgentEmail} onChange={e => setNewAgentEmail(e.target.value)}
                placeholder="Email (optional)" type="email"
                className="flex-1 border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
              <div className="flex gap-2.5 items-center">
                {AGENT_COLORS.filter(c => !agencyAgents.some(a => a.color === c)).map(c => (
                  <button key={c} type="button" onClick={() => setNewAgentColor(c)}
                    className={'w-7 h-7 rounded-full transition-transform ' + (newAgentColor === c ? 'ring-2 ring-offset-2 ring-[#1B2E4B]' : 'hover:scale-110')}
                    style={{ background: c }} title="Pick color" />
                ))}
              </div>
              <button onClick={addAgencyAgent} disabled={addingAgent || !newAgentName.trim()}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: '#D3755A' }}>
                {addingAgent ? 'Adding…' : 'Add agent'}
              </button>
            </div>
            <p className="text-xs text-[#9B928E] mt-3">Display-only — doesn't grant login. Use "Invite" below to give a team member their own login.</p>
          </div>

          {/* Invite team member with login */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Invite team member (with login)</h2>
            <div className="flex gap-3 flex-wrap">
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Full name"
                className="flex-1 border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email" type="email"
                className="flex-1 border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
              <label className="flex items-center gap-2 text-sm text-[#3D3A38] cursor-pointer">
                <input type="checkbox" checked={inviteIsAdmin} onChange={e => setInviteIsAdmin(e.target.checked)}
                  className="w-4 h-4 accent-[#D3755A]" />
                Admin
              </label>
              <button onClick={sendInvite} disabled={invitingLoading || !inviteName.trim() || !inviteEmail.trim()}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: '#1B2E4B' }}>
                {invitingLoading ? 'Creating…' : 'Create invite'}
              </button>
            </div>
            {inviteError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{inviteError}</div>}
            {inviteLink && (
              <div className="mt-4 bg-[#F5EBE0] rounded-xl p-4">
                <div className="text-xs font-semibold text-[#1B2E4B] mb-2">Invitation link ready — send this to your team member:</div>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink}
                    onFocus={e => e.currentTarget.select()}
                    className="flex-1 border border-[#E8E2DA] rounded-lg px-3 py-2 text-xs text-[#1B2E4B] bg-white font-mono" />
                  <button type="button" onClick={() => {
                    navigator.clipboard.writeText(inviteLink!)
                    setInviteCopied(true)
                    setTimeout(() => setInviteCopied(false), 2000)
                  }}
                    className={'text-xs px-3 py-2 rounded-lg border transition-colors ' + (inviteCopied ? 'border-green-500 text-green-600 bg-green-50' : 'border-[#D3755A] text-[#D3755A] hover:bg-[#D3755A] hover:text-white')}>
                    {inviteCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="text-[10px] text-[#9B928E] mt-2">The invitee will set their own password when they click the link.</div>
              </div>
            )}
          </div>

          {/* Agent list */}
          {agencyAgents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E]">No team members yet. Add agents above to assign them to listings.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {agencyAgents.map(a => (
                <div key={a.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: a.color || '#F5EBE0' }}>
                    <span className="text-sm font-medium text-white">{a.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1B2E4B]">{a.name}</div>
                    {a.email && <div className="text-xs text-[#9B928E]">{a.email}</div>}
                    <div className="text-xs text-[#9B928E] capitalize">{a.role}</div>
                  </div>
                  <div className="text-xs text-[#9B928E]">
                    {listingsState.filter(l => l.assigned_agent_name === a.name).length} listings
                  </div>
                  <button onClick={() => removeAgencyAgent(a.id)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
