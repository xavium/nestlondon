'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface SavedProperty {
  id: string
  created_at: string
  listing_id: string
  listings: {
    id: string
    address: string
    price: number
    bedrooms: number | null
    bathrooms: number | null
    property_type: string | null
    borough: string | null
    images: string
    is_active: boolean
  } | null
}

interface SavedSearch {
  id: string
  name: string | null
  params: Record<string, string>
  created_at: string
}

interface Props {
  user: { id: string, email: string, name: string, phone: string, created_at: string, role?: string }
  savedProperties: SavedProperty[]
  savedSearches: SavedSearch[]
}

function getImg(images: string): string | null {
  try {
    const imgs = typeof images === 'string' ? JSON.parse(images) : (images || [])
    return Array.isArray(imgs) ? imgs.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

function buildSearchUrl(params: Record<string, string>): string {
  return '/search?' + new URLSearchParams(params).toString()
}

function describeSearch(params: Record<string, string>): string {
  const parts: string[] = []
  if (params.location) parts.push(params.location)
  if (params.minBeds) parts.push(params.minBeds === '0' ? 'Studio' : params.minBeds + ' bed min')
  if (params.maxPrice) parts.push('up to £' + parseInt(params.maxPrice).toLocaleString())
  if (params.radius) parts.push('within ' + params.radius + ' mi')
  return parts.length > 0 ? parts.join(' · ') : 'All London rentals'
}

export default function AccountClient({ user, savedProperties, savedSearches }: Props) {
  const [tab, setTab] = useState<'saved' | 'searches' | 'account'>('saved')
  const [props, setProps] = useState(savedProperties)
  const [searches, setSearches] = useState(savedSearches)
  const router = useRouter()
  const supabase = createClient()

  async function unsaveProperty(savedId: string) {
    await fetch('/api/saved/property', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_id: savedId })
    })
    setProps(p => p.filter(x => x.id !== savedId))
  }

  async function deleteSearch(id: string) {
    await fetch('/api/saved/search', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setSearches(s => s.filter(x => x.id !== id))
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      {/* Nav */}
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{fontFamily:'Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm hidden sm:block">{user.name || user.email}</span>
          {(user.role === 'owner' || user.role === 'landlord') && (
            <Link href="/dashboard/owner" className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white transition-colors no-underline">My portal</Link>
          )}
          <button onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color:'#D3755A'}}>My account</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>{user.name || 'Your account'}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'saved', label: `Saved properties (${props.length})` },
            { key: 'searches', label: `Saved searches (${searches.length})` },
            { key: 'account', label: 'Account details' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (tab === t.key ? 'text-white' : 'text-[#3D3A38] bg-white border border-[#E8E2DA]')}
              style={tab === t.key ? {background:'#1B2E4B'} : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Saved Properties */}
        {tab === 'saved' && (
          <div>
            {props.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'rgba(211,117,90,0.10)'}}>
                <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
                <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No saved properties yet</h2>
                <p className="text-sm text-[#9B928E] mb-6">Heart a property on the search or listing page to save it here.</p>
                <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{background:'#D3755A'}}>Browse properties →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {props.map(p => {
                  const l = p.listings
                  if (!l) return null
                  const img = getImg(l.images)
                  return (
                    <div key={p.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
                      <Link href={`/listings/${l.id}`} className="no-underline block">
                        <div className="h-40 bg-[#F5EBE0] overflow-hidden">
                          {img ? <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : <div className="w-full h-full flex items-center justify-center text-[#9B928E]">
                              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                            </div>}
                        </div>
                        <div className="p-4">
                          <div className="font-medium text-[#1B2E4B] text-sm truncate">{l.address}</div>
                          <div className="text-xs text-[#9B928E] mt-0.5">
                            £{l.price?.toLocaleString()}/mo · {l.bedrooms === 0 ? 'Studio' : (l.bedrooms || '?') + ' bed'} · {l.property_type}
                          </div>
                        </div>
                      </Link>
                      <div className="px-4 pb-4 flex items-center justify-between">
                        <span className="text-xs text-[#9B928E]">Saved {new Date(p.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</span>
                        <button onClick={() => unsaveProperty(p.id)}
                          className="text-xs text-[#9B928E] hover:text-red-500 transition-colors">
                          Remove ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Saved Searches */}
        {tab === 'searches' && (
          <div className="flex flex-col gap-3">
            {searches.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'rgba(211,117,90,0.10)'}}>
                <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
                  <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
                <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>No saved searches yet</h2>
                <p className="text-sm text-[#9B928E] mb-6">Save a search on the results page to quickly run it again.</p>
                <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{background:'#D3755A'}}>Start searching →</Link>
              </div>
            ) : searches.map(s => (
              <div key={s.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1B2E4B] text-sm">{s.name || describeSearch(s.params)}</div>
                  <div className="text-xs text-[#9B928E] mt-0.5">{describeSearch(s.params)}</div>
                  <div className="text-xs text-[#9B928E]">Saved {new Date(s.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={buildSearchUrl(s.params)}
                    className="text-xs px-4 py-2 rounded-xl text-white no-underline transition-opacity hover:opacity-90"
                    style={{background:'#D3755A'}}>
                    Search again →
                  </Link>
                  <button onClick={() => deleteSearch(s.id)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#E8E2DA] text-[#9B928E] hover:border-red-300 hover:text-red-500 transition-colors">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Account Details */}
        {tab === 'account' && (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-5">
            <h2 className="text-lg font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>Account details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Full name</div>
                <div className="text-sm text-[#1B2E4B]">{user.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Email</div>
                <div className="text-sm text-[#1B2E4B]">{user.email}</div>
              </div>
              <div>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Phone</div>
                <div className="text-sm text-[#1B2E4B]">{user.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Member since</div>
                <div className="text-sm text-[#1B2E4B]">{new Date(user.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</div>
              </div>
              <div>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Account type</div>
                <div className="text-sm text-[#1B2E4B] capitalize">
                  {user.role === 'owner' ? 'Private owner' : user.role === 'landlord' ? 'Landlord' : user.role === 'agent' ? 'Letting agent' : 'Tenant'}
                </div>
              </div>
            </div>
            <div className="border-t border-[#E8E2DA] pt-4 flex gap-3 flex-wrap">
              <button onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38] hover:border-red-300 hover:text-red-600 transition-colors">
                Sign out
              </button>
              <button onClick={handleDeleteAccount}
                className="px-5 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors">
                Delete account
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
