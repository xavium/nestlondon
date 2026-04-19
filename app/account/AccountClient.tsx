'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavAuthButton from '@/components/NavAuthButton'
import RenterProfileForm from '@/components/RenterProfileForm'

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
  alerts_enabled: boolean
}

interface Props {
  user: { id: string, email: string, name: string, phone: string, created_at: string, role?: string, commute_address?: string, agentRecord?: any }
  savedProperties: SavedProperty[]
  savedSearches: SavedSearch[]
  initialTab?: 'profile' | 'account'
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

export default function AccountClient({ user, savedProperties, savedSearches, initialTab }: Props) {
  const isAgent = user.role === 'agent'
  const [tab, setTab] = useState<string>( user.role === 'resident' || user.role === 'tenant' || !user.role || user.role === 'user' ? 'profile' : 'account')
  const [props, setProps] = useState(savedProperties)
  const [searches, setSearches] = useState(savedSearches)
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(savedSearches.map(s => [s.id, s.alerts_enabled]))
  )
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

  async function toggleAlerts(id: string) {
    const newVal = !alertToggles[id]
    setAlertToggles(t => ({ ...t, [id]: newVal }))
    await fetch('/api/saved/search/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, alerts_enabled: newVal })
    })
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

  const TABS = [
    ...(user.role === 'resident' || user.role === 'tenant' || !user.role || user.role === 'user' ? [{ key: 'profile', label: 'Renter profile' }] : []),
    { key: 'account', label: 'Account details' },
    ...(isAgent ? [{ key: 'feed', label: 'BLM Feed' }] : []),
  ] as const

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <Link href="/boroughs" className="text-sm text-white/70 hover:text-white transition-colors no-underline mr-4">Borough guides</Link>
        <NavAuthButton variant="dark" />
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>My account</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>{user.name || 'Your account'}</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (tab === t.key ? 'text-white' : 'text-[#3D3A38] bg-white border border-[#E8E2DA]')}
              style={tab === t.key ? { background: '#1B2E4B' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Saved Properties */}
        {tab === 'saved' && (
          <div>
            {props.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No saved properties yet</h2>
                <p className="text-sm text-[#9B928E] mb-6">Heart a property on the search or listing page to save it here.</p>
                <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
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
                        <span className="text-xs text-[#9B928E]">Saved {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        <button onClick={() => unsaveProperty(p.id)} className="text-xs text-[#9B928E] hover:text-red-500 transition-colors">Remove ×</button>
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
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
                    <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No saved searches yet</h2>
                <p className="text-sm text-[#9B928E] mb-6">Save a search on the results page to get email alerts when new matches arrive.</p>
                <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Start searching →</Link>
              </div>
            ) : searches.map(s => (
              <div key={s.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#1B2E4B] text-sm">{s.name || describeSearch(s.params)}</div>
                    <div className="text-xs text-[#9B928E] mt-0.5">{describeSearch(s.params)}</div>
                    <div className="text-xs text-[#9B928E]">Saved {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 items-center">
                    <Link href={buildSearchUrl(s.params)}
                      className="text-xs px-4 py-2 rounded-xl text-white no-underline transition-opacity hover:opacity-90"
                      style={{ background: '#D3755A' }}>
                      Search again →
                    </Link>
                    <button onClick={() => deleteSearch(s.id)}
                      className="text-xs px-3 py-2 rounded-xl border border-[#E8E2DA] text-[#9B928E] hover:border-red-300 hover:text-red-500 transition-colors">
                      ×
                    </button>
                  </div>
                </div>
                {/* Alert toggle */}
                <div className="mt-4 pt-3 border-t border-[#F5F0EB] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#1B2E4B]">Email alerts</div>
                    <div className="text-xs text-[#9B928E]">
                      {alertToggles[s.id] ? "You'll be emailed when new matches are found" : 'Get notified when new properties match this search'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAlerts(s.id)}
                    className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none"
                    style={{ background: alertToggles[s.id] ? '#D3755A' : '#E8E2DA' }}
                    aria-label={alertToggles[s.id] ? 'Disable alerts' : 'Enable alerts'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alertToggles[s.id] ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Account Details */}
        {tab === 'profile' && (
          <RenterProfileForm />
        )}

        {tab === 'feed' && isAgent && (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#1B2E4B] mb-2">BLM Feed integration</h2>
            <p className="text-xs text-[#9B928E] mb-4 leading-relaxed">
              Connect your CRM to automatically sync listings. Configure your CRM (Reapit, Jupix, Alto, Dezrez) to POST your BLM file to the endpoint below.
            </p>
            {user.agentRecord?.api_key ? (
              <div className="flex flex-col gap-3">
                <div className="bg-[#1B2E4B] rounded-xl p-4">
                  <div className="text-xs text-white/60 mb-1">Feed endpoint</div>
                  <div className="font-mono text-sm text-white break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/feed/blm</div>
                </div>
                <div className="bg-[#F5EBE0] rounded-xl p-4">
                  <div className="text-xs text-[#9B928E] mb-1">Your API key</div>
                  <div className="font-mono text-xs text-[#1B2E4B] break-all">{user.agentRecord.api_key}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#9B928E]">Contact NestLondon to get your BLM feed API key set up.</p>
            )}
          </div>
        )}

        {tab === 'account' && (
          <AccountDetailsForm user={user} onSignOut={handleSignOut} onDeleteAccount={handleDeleteAccount} />
        )}
      </div>
    </main>
  )
}

function AccountDetailsForm({ user, onSignOut, onDeleteAccount }: {
  user: { id: string, email: string, name: string, phone: string, created_at: string, role?: string, commute_address?: string, agentRecord?: any }
  onSignOut: () => void
  onDeleteAccount: () => void
}) {
  const supabase = createClient()
  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [commuteAddress, setCommuteAddress] = useState(user.commute_address || '')
  const [phone, setPhone] = useState(user.phone || '')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [displayName, setDisplayName] = useState(user.name || '')
  const [displayPhone, setDisplayPhone] = useState(user.phone || '')

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, commute_address: commuteAddress }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setDisplayName(name)
      setDisplayPhone(phone)
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditing(false) }, 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    if (newEmail !== confirmEmail) {
      setEmailError('Email addresses do not match')
      return
    }
    if (newEmail === user.email) {
      setEmailError('This is already your current email')
      return
    }
    setSavingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailSent(true)
      setNewEmail('')
      setConfirmEmail('')
    } catch (e: any) {
      setEmailError(e.message)
    } finally {
      setSavingEmail(false)
    }
  }

  const roleLabel = user.role === 'owner' ? 'Private owner'
    : user.role === 'landlord' ? 'Landlord'
    : user.role === 'agent' ? 'Letting agent'
    : 'Resident'

  return (
    <div className="flex flex-col gap-5">

      {/* Summary / edit toggle */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Account details</h2>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors">
              Edit details
            </button>
          )}
        </div>

        {!editing ? (
          /* ── Read view ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Full name', value: displayName || '—' },
              { label: 'Email', value: user.email },
              { label: 'Phone', value: displayPhone || '—' },
              { label: 'Member since', value: new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Account type', value: roleLabel },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-sm text-[#1B2E4B]">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Edit view ── */
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Full name</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Your full name" />
              </div>
              <div>
                <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+44 7700 000000" type="tel" />
              </div>
              <div>
                <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Account type</label>
                <div className="flex items-center gap-2 py-2.5">
                  <span className="text-sm text-[#1B2E4B]">{roleLabel}</span>
                  <span className="text-xs text-[#9B928E]">· cannot be changed</span>
                </div>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}
            {saved && <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl px-3 py-2">Saved successfully.</div>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setEditing(false); setName(displayName); setPhone(displayPhone); setError('') }}
                className="px-5 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38] hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: '#D3755A' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Email change — only shown in edit mode */}
      {editing && (
        <form onSubmit={changeEmail} className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Change email</h2>
            <p className="text-xs text-[#9B928E] mt-1">Current: <span className="text-[#1B2E4B]">{user.email}</span></p>
          </div>
          {emailSent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              Confirmation sent. Check your inbox and click the link to confirm the change.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">New email</label>
                  <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    className={inputClass} placeholder="new@email.com" />
                </div>
                <div>
                  <label className="text-xs text-[#9B928E] uppercase tracking-wide mb-1 block">Confirm new email</label>
                  <input required type="email" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)}
                    className={inputClass} placeholder="new@email.com again" />
                </div>
              </div>
              {emailError && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{emailError}</div>}
              <div className="flex justify-end">
                <button type="submit" disabled={savingEmail || !newEmail || !confirmEmail}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: '#1B2E4B' }}>
                  {savingEmail ? 'Sending…' : 'Send confirmation'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Danger zone */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Sign out &amp; account</h2>
        <div className="flex gap-3 flex-wrap">
          <button onClick={onSignOut} className="px-5 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38] hover:border-red-300 hover:text-red-600 transition-colors">Sign out</button>
          <button onClick={onDeleteAccount} className="px-5 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors">Delete account</button>
        </div>
        <p className="text-xs text-[#9B928E]">To change your account type, delete your account and sign up again with the appropriate role.</p>
      </div>
    </div>
  )
}
