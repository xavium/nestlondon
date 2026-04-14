'use client'

import { useState } from 'react'
import Link from 'next/link'

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
}

interface Props {
  user: { email: string; name: string; id: string }
  agentRecord: any
  listings: Listing[]
  viewingRequests: any[]
  messages: any[]
  events: any[]
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

export default function AgentDashboardClient({ user, agentRecord, listings, viewingRequests, messages, events }: Props) {
  const [tab, setTab] = useState<'overview' | 'listings' | 'viewings' | 'enquiries' | 'feed'>('overview')

  // Search/filter state
  const [listingSearch, setListingSearch] = useState('')
  const [listingMinBeds, setListingMinBeds] = useState<number | null>(null)
  const [listingMaxPrice, setListingMaxPrice] = useState<number | null>(null)
  const [listingStatusFilter, setListingStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [assigningId, setAssigningId] = useState<string | null>(null)
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
  const listingStats = listings.map(l => ({
    ...l,
    views: events.filter(e => e.listing_id === l.id && e.event_type === 'view').length,
    viewings: viewingRequests.filter(v => v.listing_id === l.id).length,
    enquiries: messages.filter(m => m.listing_id === l.id).length,
  }))

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

  const activeListings = listings.filter(l => l.is_active)
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
    setAssigningId(null)
    setAssignName('')
    setAssigning(false)
    window.location.reload()
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: `Listings (${activeListings.length})` },
    { key: 'viewings', label: `Viewings (${pendingViewings + confirmedViewings})` },
    { key: 'enquiries', label: `Enquiries (${filteredMessages.length})` },
    { key: 'feed', label: 'BLM Feed' },
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
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Agent portal</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>
            {agentRecord?.name || user.name || 'Your agency'}
          </h1>
          <p className="text-sm text-[#9B928E] mt-1">{user.email}</p>
        </div>
        <Link href="/list"
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

      {/* Overview */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          {assignedAgents.length > 0 && <AgentFilterBar />}
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
          {/* Search and filters */}
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
            <span className="text-xs text-[#9B928E]">{filteredListingStats.length} of {listings.length}</span>
          </div>

          {filteredListingStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E] mb-4">No listings match.</p>
              <Link href="/list" className="px-5 py-2.5 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Add a listing →</Link>
            </div>
          ) : filteredListingStats.map(l => (
            <div key={l.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5 flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#F5EBE0] flex-shrink-0">
                {getImg(l.images) ? <img src={getImg(l.images)!} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-sm font-medium text-[#1B2E4B] truncate">{l.address}</div>
                  <span className={'text-xs px-2 py-0.5 rounded-full flex-shrink-0 ' + (l.is_active ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500')}>
                    {l.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-[#9B928E] mb-2">£{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}</div>
                <div className="flex gap-4 text-xs text-[#9B928E] mb-2">
                  <span>{l.views} views</span>
                  <span>{l.viewings} viewings</span>
                  <span>{l.enquiries} enquiries</span>
                </div>
                {/* Agent assignment */}
                {assigningId === l.id ? (
                  <div className="flex gap-2 items-center mt-1">
                    <input value={assignName} onChange={e => setAssignName(e.target.value)}
                      placeholder="Agent name..."
                      className="flex-1 border border-[#D3755A] rounded-lg px-2 py-1 text-xs outline-none"
                      list="agent-names"
                    />
                    <datalist id="agent-names">
                      {assignedAgents.map(a => <option key={a.id} value={a.name} />)}
                    </datalist>
                    <button onClick={() => assignAgent(l.id)} disabled={assigning}
                      className="text-xs px-2 py-1 rounded-lg text-white disabled:opacity-50"
                      style={{background:'#D3755A'}}>Save</button>
                    <button onClick={() => setAssigningId(null)} className="text-xs px-2 py-1 rounded-lg border border-[#E8E2DA] text-[#9B928E]">✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setAssigningId(l.id); setAssignName(l.assigned_agent_name || '') }}
                    className="text-xs text-[#9B928E] hover:text-[#D3755A] transition-colors flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {l.assigned_agent_name ? l.assigned_agent_name : 'Assign agent'}
                  </button>
                )}
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
                <button onClick={() => manageListing(l.id, 'delete')}
                  className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewings */}
      {tab === 'viewings' && (
        <div className="flex flex-col gap-4">
          {assignedAgents.length > 0 && <AgentFilterBar />}
          {filteredViewings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
              <p className="text-sm text-[#9B928E]">No viewing requests.</p>
            </div>
          ) : filteredViewings.map(v => {
            const listing = listings.find(l => l.id === v.listing_id)
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
            const listing = listings.find(l => l.id === m.listing_id)
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

      {/* BLM Feed */}
      {tab === 'feed' && (
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#1B2E4B] mb-2">BLM Feed integration</h2>
          <p className="text-xs text-[#9B928E] mb-4 leading-relaxed">
            Connect your CRM to automatically sync listings. Configure your CRM (Reapit, Jupix, Alto, Dezrez) to POST your BLM file to the endpoint below.
          </p>
          {agentRecord?.api_key ? (
            <div>
              <div className="bg-[#1B2E4B] rounded-xl p-4 mb-4">
                <div className="text-xs text-white/60 mb-1">Feed endpoint</div>
                <div className="font-mono text-sm text-white">{typeof window !== 'undefined' ? window.location.origin : 'https://nestlondon.co.uk'}/api/feed/blm</div>
              </div>
              <div className="bg-[#F5EBE0] rounded-xl p-4">
                <div className="text-xs text-[#9B928E] mb-1">Your API key</div>
                <div className="font-mono text-xs text-[#1B2E4B] break-all">{agentRecord.api_key}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9B928E]">Contact NestLondon to get your BLM feed API key set up.</p>
          )}
        </div>
      )}
    </div>
  )
}
