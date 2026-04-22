'use client'

import { useState } from 'react'
import NavAuthButton from '@/components/NavAuthButton'
import Link from 'next/link'

interface Listing {
  id: string
  address: string
  price: number
  bedrooms: number | null
  property_type: string | null
  source: string
  listed_at: string
  description?: string
  images?: string
  raw_data?: any
  is_active?: boolean
}

export default function AdminListingsClient({
  pending, approved, deactivated: initialDeactivated = [], adminKey
}: {
  pending: Listing[]
  approved: Listing[]
  deactivated?: Listing[]
  adminKey: string
}) {
  const [pendingList, setPendingList] = useState(pending)
  const [approvedList, setApprovedList] = useState(approved)
  const [deactivatedList, setDeactivatedList] = useState<Listing[]>(initialDeactivated)
  const [loading, setLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'approved' | 'deactivated'>('pending')
  const [search, setSearch] = useState('')

  function matchesSearch(l: Listing) {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const contact = getContact(l)
    return (
      l.address?.toLowerCase().includes(q) ||
      contact.name?.toLowerCase().includes(q) ||
      contact.email?.toLowerCase().includes(q) ||
      contact.company_name?.toLowerCase().includes(q)
    )
  }

  async function approve(id: string) {
    setLoading(id)
    const res = await fetch('/api/admin/listing-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', adminKey })
    })
    if (res.ok) {
      const listing = pendingList.find(l => l.id === id)!
      setPendingList(p => p.filter(l => l.id !== id))
      setApprovedList(a => [{ ...listing, is_active: true }, ...a])
    }
    setLoading(null)
  }

  async function reject(id: string) {
    if (!confirm('Reject and delete this listing?')) return
    setLoading(id)
    const res = await fetch('/api/admin/listing-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject', adminKey })
    })
    if (res.ok) setPendingList(p => p.filter(l => l.id !== id))
    setLoading(null)
  }

  async function deactivate(id: string) {
    setLoading(id)
    const res = await fetch('/api/admin/listing-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'deactivate', adminKey })
    })
    if (res.ok) {
      const listing = approvedList.find(l => l.id === id)!
      setApprovedList(a => a.filter(l => l.id !== id))
      setDeactivatedList(d => [{ ...listing, is_active: false }, ...d])
    }
    setLoading(null)
  }

  async function reactivate(id: string) {
    setLoading(id)
    const res = await fetch('/api/admin/listing-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve', adminKey })
    })
    if (res.ok) {
      const listing = deactivatedList.find(l => l.id === id)!
      setDeactivatedList(d => d.filter(l => l.id !== id))
      setApprovedList(a => [{ ...listing, is_active: true }, ...a])
    }
    setLoading(null)
  }

  function getContact(listing: Listing) {
    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
    return rd?.contact || {}
  }

  function getImages(listing: Listing): string[] {
    try {
      const imgs = typeof listing.images === 'string' ? JSON.parse(listing.images) : (listing.images || [])
      return Array.isArray(imgs) ? imgs.filter((u: string) => u?.startsWith('http')) : []
    } catch { return [] }
  }

  const card = (l: Listing, actions: React.ReactNode) => {
    const contact = getContact(l)
    const images = getImages(l)
    const isExpanded = expanded === l.id
    const rd = typeof l.raw_data === 'string' ? JSON.parse(l.raw_data || '{}') : (l.raw_data || {})

    return (
      <div key={l.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
        <div className="flex items-start gap-4 p-5">
          {/* Image */}
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
            {images[0] ? (
              <img src={images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</h3>
                <div className="flex gap-3 text-xs text-[#9B928E] mt-0.5">
                  <span>£{l.price?.toLocaleString()}/mo</span>
                  {l.bedrooms !== null && <span>{l.bedrooms === 0 ? 'Studio' : l.bedrooms + ' bed'}</span>}
                  {l.property_type && <span>{l.property_type}</span>}
                  <span className="px-1.5 py-0.5 rounded-full text-xs" style={{background:'rgba(211,117,90,0.12)', color:'#D3755A'}}>{l.source}</span>
                </div>
                {contact.name && (
                  <div className="text-xs text-[#3D3A38] mt-1.5">
                    <span className="font-medium">{contact.name}</span>
                    {contact.email && <span className="text-[#9B928E]"> · {contact.email}</span>}
                    {contact.phone && <span className="text-[#9B928E]"> · {contact.phone}</span>}
                  </div>
                )}
              </div>
              <div className="text-xs text-[#9B928E] flex-shrink-0">
                {new Date(l.listed_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {actions}
              <button
                onClick={() => setExpanded(isExpanded ? null : l.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A] transition-colors"
              >{isExpanded ? 'Less ↑' : 'Details ↓'}</button>
              <a href={`/listings/${l.id}?preview=true`} target="_blank"
                className="text-xs px-3 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:border-[#D3755A] transition-colors no-underline">
                Preview ↗
              </a>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-[#E8E2DA] p-5 bg-[#F5EBE0]">
            {l.description && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1">Description</div>
                <p className="text-sm text-[#3D3A38] leading-relaxed whitespace-pre-line">{l.description}</p>
              </div>
            )}
            {rd?.key_features?.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1">Features</div>
                <div className="flex flex-wrap gap-1.5">
                  {rd.key_features.map((f: string) => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-white border border-[#E8E2DA] text-[#3D3A38]">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {images.length > 1 && (
              <div>
                <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">{images.length} photos</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <img key={i} src={img} className="h-20 w-28 object-cover rounded-lg flex-shrink-0" referrerPolicy="no-referrer" />
                  ))}
                </div>
              </div>
            )}
            {contact.company_name && (
              <div className="mt-3 text-xs text-[#9B928E]">Company: {contact.company_name} {contact.company_reg && `(${contact.company_reg})`}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <div className="text-white font-light text-lg" style={{fontFamily:'Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
          <span className="text-white/40 text-sm ml-3">Admin</span>
        </div>
        
        <NavAuthButton variant="dark" />
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
            <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Pending review</div>
            <div className="text-3xl font-light text-[#1B2E4B]">{pendingList.length}</div>
          </div>
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
            <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Live direct listings</div>
            <div className="text-3xl font-light text-[#1B2E4B]">{approvedList.length}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5"/><path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by address, owner name or email..."
            className="w-full bg-white border border-[#E8E2DA] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B928E] hover:text-[#3D3A38]">✕</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'deactivated'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (tab === t ? 'text-white' : 'text-[#3D3A38] bg-white border border-[#E8E2DA]')}
              style={tab === t ? {background:'#1B2E4B'} : {}}
            >
              {t === 'pending' ? `Pending (${pendingList.filter(matchesSearch).length}/${pendingList.length})` : t === 'approved' ? `Approved (${approvedList.filter(matchesSearch).length}/${approvedList.length})` : `Deactivated (${deactivatedList.filter(matchesSearch).length})`}
            </button>
          ))}
        </div>

        {/* Pending listings */}
        {tab === 'pending' && (
          <div className="flex flex-col gap-4">
            {pendingList.filter(matchesSearch).length === 0 ? (
              <div className="text-center py-16 text-[#9B928E]">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.5"/></svg>
                <p>No listings pending review</p>
              </div>
            ) : pendingList.filter(matchesSearch).map(l => card(l,
              <>
                <button
                  onClick={() => approve(l.id)}
                  disabled={loading === l.id}
                  className="text-xs px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{background:'#D3755A'}}
                >
                  {loading === l.id ? '...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => reject(l.id)}
                  disabled={loading === l.id}
                  className="text-xs px-4 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  ✕ Reject
                </button>
              </>
            ))}
          </div>
        )}

        {/* Deactivated listings */}
        {tab === 'deactivated' && (
          <div className="flex flex-col gap-4">
            {deactivatedList.filter(matchesSearch).length === 0 ? (
              <div className="text-center py-16 text-[#9B928E]">{search ? 'No results match your search' : 'No deactivated listings'}</div>
            ) : deactivatedList.filter(matchesSearch).map(l => card(l,
              <button
                onClick={() => reactivate(l.id)}
                disabled={loading === l.id}
                className="text-xs px-4 py-1.5 rounded-lg border border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A] transition-colors"
              >
                {loading === l.id ? '...' : '↑ Reactivate'}
              </button>
            ))}
          </div>
        )}

        {/* Approved listings */}
        {tab === 'approved' && (
          <div className="flex flex-col gap-4">
            {approvedList.filter(matchesSearch).length === 0 ? (
              <div className="text-center py-16 text-[#9B928E]">{search ? 'No results match your search' : 'No approved direct listings yet'}</div>
            ) : approvedList.filter(matchesSearch).map(l => card(l,
              <button
                onClick={() => deactivate(l.id)}
                disabled={loading === l.id}
                className="text-xs px-4 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E] hover:border-red-300 hover:text-red-600 transition-colors"
              >
                {loading === l.id ? '...' : 'Deactivate'}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
