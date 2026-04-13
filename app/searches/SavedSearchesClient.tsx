'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SavedSearch {
  id: string
  name: string | null
  params: Record<string, string>
  created_at: string
  alerts_enabled: boolean
  alert_frequency: 'instant' | 'daily' | 'weekly' | 'none'
  new_matches?: number
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

const FREQUENCY_OPTIONS = [
  { value: 'instant', label: 'Instant', desc: 'As each new match is added' },
  { value: 'daily',   label: 'Daily digest', desc: 'One email per day with all new matches' },
  { value: 'weekly',  label: 'Weekly digest', desc: 'One email per week with all new matches' },
  { value: 'none',    label: 'No emails', desc: 'Save search without email alerts' },
] as const

export default function SavedSearchesClient({ savedSearches }: { savedSearches: SavedSearch[] }) {
  const [searches, setSearches] = useState(savedSearches)
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(savedSearches.map(s => [s.id, s.alerts_enabled]))
  )
  const [frequencies, setFrequencies] = useState<Record<string, string>>(
    Object.fromEntries(savedSearches.map(s => [s.id, s.alert_frequency || 'instant']))
  )
  const [openFreq, setOpenFreq] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editParams, setEditParams] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  async function startRename(s: SavedSearch) {
    setRenamingId(s.id)
    setRenameVal(s.name || describeSearch(s.params))
  }

  async function submitRename(id: string) {
    setRenameLoading(true)
    await fetch('/api/saved/search/rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: renameVal.trim() || null })
    })
    setSearches(ss => ss.map(s => s.id === id ? { ...s, name: renameVal.trim() || null } : s))
    setRenamingId(null)
    setRenameLoading(false)
  }

  async function saveEditedSearch(id: string) {
    setSavingEdit(true)
    await fetch('/api/saved/search/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, params: editParams })
    })
    setSearches(ss => ss.map(s => s.id === id ? { ...s, params: editParams } : s))
    setEditingId(null)
    setSavingEdit(false)
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
      body: JSON.stringify({ id, alerts_enabled: newVal, alert_frequency: frequencies[id] })
    })
  }

  async function setFrequency(id: string, freq: string) {
    setFrequencies(f => ({ ...f, [id]: freq }))
    setOpenFreq(null)
    const enabled = freq !== 'none'
    setAlertToggles(t => ({ ...t, [id]: enabled }))
    await fetch('/api/saved/search/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, alerts_enabled: enabled, alert_frequency: freq })
    })
  }

  if (searches.length === 0) return (
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
  )

  return (
    <div className="flex flex-col gap-3">
      {searches.map(s => (
        <div key={s.id} className="bg-white border border-[#E8E2DA] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {renamingId === s.id ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(s.id); if (e.key === 'Escape') setRenamingId(null) }}
                    autoFocus
                    className="flex-1 border border-[#D3755A] rounded-lg px-3 py-1.5 text-sm text-[#1B2E4B] outline-none bg-white"
                    placeholder="Name this search..."
                  />
                  <button onClick={() => submitRename(s.id)} disabled={renameLoading}
                    className="text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                    style={{ background: '#D3755A' }}>
                    {renameLoading ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setRenamingId(null)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-[#E8E2DA] text-[#9B928E]">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="font-medium text-[#1B2E4B] text-sm">{s.name || describeSearch(s.params)}</div>
                  {s.new_matches != null && s.new_matches > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: '#D3755A' }}>
                      {s.new_matches} new
                    </span>
                  )}
                  <button onClick={() => startRename(s)} title="Rename"
                    className="text-[#9B928E] hover:text-[#D3755A] transition-colors flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}
              <div className="text-xs text-[#9B928E]">{describeSearch(s.params)}</div>
              <div className="text-xs text-[#9B928E]">Saved {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0 items-center">
              <button onClick={() => { setEditingId(editingId === s.id ? null : s.id); setEditParams({...s.params}) }}
                className="text-xs px-3 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0] transition-colors">
                Edit search
              </button>
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
          <div className="mt-4 pt-3 border-t border-[#F5F0EB]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold text-[#1B2E4B]">Email alerts</div>
                <div className="text-xs text-[#9B928E]">
                  {alertToggles[s.id] ? "You'll be notified when new matches are found" : 'Alerts are off for this search'}
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
            {/* Frequency selector */}
            <div className="relative">
              <button
                onClick={() => setOpenFreq(openFreq === s.id ? null : s.id)}
                className="w-full flex items-center justify-between px-3 py-2 border border-[#E8E2DA] rounded-xl text-xs text-[#1B2E4B] hover:border-[#D3755A] transition-colors bg-white"
              >
                <span>
                  <span className="font-medium">{FREQUENCY_OPTIONS.find(f => f.value === frequencies[s.id])?.label || 'Instant'}</span>
                  <span className="text-[#9B928E] ml-2">{FREQUENCY_OPTIONS.find(f => f.value === frequencies[s.id])?.desc}</span>
                </span>
                <svg className="w-3.5 h-3.5 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              {openFreq === s.id && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E2DA] rounded-xl shadow-xl z-50 overflow-hidden">
                  {FREQUENCY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setFrequency(s.id, opt.value)}
                      className={'w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ' + (frequencies[s.id] === opt.value ? 'bg-[#F5EBE0]' : 'hover:bg-[#FAFAF9]')}>
                      <div>
                        <div className={'text-xs font-medium ' + (frequencies[s.id] === opt.value ? 'text-[#D3755A]' : 'text-[#1B2E4B]')}>{opt.label}</div>
                        <div className="text-[10px] text-[#9B928E]">{opt.desc}</div>
                      </div>
                      {frequencies[s.id] === opt.value && (
                        <svg className="w-3.5 h-3.5 text-[#D3755A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Edit search params */}
          {editingId === s.id && (
            <div className="mt-4 pt-3 border-t border-[#F5F0EB]">
              <div className="text-xs font-semibold text-[#1B2E4B] mb-3">Edit search criteria</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Location</label>
                  <input value={editParams.location || ''} onChange={e => setEditParams(p => ({...p, location: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                    placeholder="e.g. Shoreditch, E1" />
                </div>
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Min beds</label>
                  <select value={editParams.minBeds || ''} onChange={e => setEditParams(p => ({...p, minBeds: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} bed</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Max beds</label>
                  <select value={editParams.maxBeds || ''} onChange={e => setEditParams(p => ({...p, maxBeds: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} bed</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Min price (£/mo)</label>
                  <input type="number" value={editParams.minPrice || ''} onChange={e => setEditParams(p => ({...p, minPrice: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                    placeholder="e.g. 1000" />
                </div>
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Max price (£/mo)</label>
                  <input type="number" value={editParams.maxPrice || ''} onChange={e => setEditParams(p => ({...p, maxPrice: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
                    placeholder="e.g. 2500" />
                </div>
                <div>
                  <label className="text-[10px] text-[#9B928E] uppercase tracking-wide mb-1 block">Radius</label>
                  <select value={editParams.radius || ''} onChange={e => setEditParams(p => ({...p, radius: e.target.value}))}
                    className="w-full border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                    <option value="">This area only</option>
                    {[0.5,1,2,3,5,10].map(r => <option key={r} value={r}>Within {r} mi</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingId(null)}
                  className="text-xs px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#9B928E] hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => saveEditedSearch(s.id)} disabled={savingEdit}
                  className="text-xs px-4 py-2 rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: '#D3755A' }}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* Latest matching listings */}
          <div className="mt-4 pt-3 border-t border-[#F5F0EB]">
            <div className="text-xs font-semibold text-[#1B2E4B] mb-1">Latest matches</div>
            <SearchMatchPreviews searchId={s.id} searchUrl={buildSearchUrl(s.params)} />
          </div>

        </div>
      ))}
    </div>
  )
}

interface MatchListing {
  id: string
  address: string
  price: number
  bedrooms: number | null
  property_type: string | null
  image: string | null
  scraped_at: string
}

function SearchMatchPreviews({ searchId, searchUrl }: { searchId: string, searchUrl: string }) {
  const [listings, setListings] = useState<MatchListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/saved/search/matches?search_id=' + searchId)
      .then(r => r.json())
      .then(d => setListings(d.listings || []))
      .finally(() => setLoading(false))
  }, [searchId])

  if (loading) return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
      {[1,2,3].map(i => (
        <div key={i} className="flex-shrink-0 w-36 h-24 bg-[#F0EBE5] rounded-xl animate-pulse" />
      ))}
    </div>
  )

  if (listings.length === 0) return (
    <p className="text-xs text-[#9B928E] mt-3">No matching listings found yet.</p>
  )

  return (
    <div className="mt-3">
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {listings.map(l => (
          <a key={l.id} href={'/listings/' + l.id}
            className="flex-shrink-0 w-36 no-underline group">
            <div className="w-36 h-24 rounded-xl overflow-hidden bg-[#F0EBE5] mb-1.5">
              {l.image
                ? <img src={l.image} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
                : <div className="w-full h-full flex items-center justify-center text-[#C8C4BF]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                  </div>
              }
            </div>
            <div className="text-xs font-medium text-[#1B2E4B] truncate group-hover:text-[#D3755A] transition-colors">{l.address}</div>
            <div className="text-xs text-[#9B928E]">£{l.price?.toLocaleString()}/mo{l.bedrooms ? ' · ' + l.bedrooms + ' bed' : ''}</div>
          </a>
        ))}
      </div>
      <a href={searchUrl} className="text-xs text-[#D3755A] hover:underline mt-2 inline-block">
        See all results →
      </a>
    </div>
  )
}
