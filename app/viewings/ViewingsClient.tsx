'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Slot { date: string; time: string; note?: string }
interface Viewing {
  id: string
  listing_id: string
  tenant_name: string
  tenant_email: string
  message?: string
  slots: Slot[]
  proposed_slot?: Slot
  status: 'pending' | 'proposed' | 'confirmed' | 'cancelled'
  confirmation_token: string
  created_at: string
  listings: {
    id: string
    address: string
    price: number
    images: string
    property_type: string | null
    bedrooms: number | null
  } | null
}

function getImg(images: any): string | null {
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images || []
    return Array.isArray(arr) ? arr.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

function formatSlot(slot: Slot): string {
  const d = new Date(slot.date + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' + slot.time
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG = {
  pending:   { label: 'Awaiting response',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  proposed:  { label: 'Time proposed',      bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  confirmed: { label: 'Confirmed',          bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  cancelled: { label: 'Cancelled',          bg: 'bg-stone-50',  text: 'text-stone-500',  border: 'border-stone-200' },
}

function CalendarView({ viewings }: { viewings: Viewing[] }) {
  const confirmed = viewings.filter(v => v.status === 'confirmed' && v.proposed_slot)
  const proposed = viewings.filter(v => v.status === 'proposed' && v.proposed_slot)
  const upcoming = [...confirmed, ...proposed].sort((a, b) =>
    new Date(a.proposed_slot!.date).getTime() - new Date(b.proposed_slot!.date).getTime()
  )

  if (upcoming.length === 0) return null

  // Get next 4 weeks
  const today = new Date()
  const weeks: Date[][] = []
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + 1) // Monday

  for (let w = 0; w < 4; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      week.push(day)
    }
    weeks.push(week)
  }

  const viewingsByDate: Record<string, Viewing[]> = {}
  for (const v of upcoming) {
    const key = v.proposed_slot!.date
    if (!viewingsByDate[key]) viewingsByDate[key] = []
    viewingsByDate[key].push(v)
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 mb-5">
      <h2 className="text-sm font-semibold text-[#1B2E4B] mb-4">Calendar</h2>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#9B928E] uppercase tracking-wide py-1">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day, di) => {
            const key = day.toISOString().split('T')[0]
            const dayViewings = viewingsByDate[key] || []
            const isToday = key === today.toISOString().split('T')[0]
            const isPast = day < today && !isToday
            return (
              <div key={di}
                className={'rounded-lg p-1 min-h-[52px] text-center ' + (isToday ? 'bg-[#F5EBE0]' : isPast ? '' : 'hover:bg-stone-50')}
              >
                <div className={'text-xs mb-1 ' + (isToday ? 'font-bold text-[#D3755A]' : isPast ? 'text-[#C8C4BF]' : 'text-[#3D3A38]')}>
                  {day.getDate()}
                </div>
                {dayViewings.map(v => (
                  <div key={v.id}
                    className={'text-[9px] px-1 py-0.5 rounded mb-0.5 truncate ' +
                      (v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {v.proposed_slot!.time}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
      <div className="flex gap-3 mt-3 pt-3 border-t border-[#F0EBE5]">
        <div className="flex items-center gap-1.5 text-xs text-[#9B928E]">
          <div className="w-3 h-3 rounded bg-green-100" />Confirmed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#9B928E]">
          <div className="w-3 h-3 rounded bg-blue-100" />Proposed
        </div>
      </div>
    </div>
  )
}

export default function ViewingsClient({ viewings }: { viewings: Viewing[] }) {
  const [tab, setTab] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [confirming, setConfirming] = useState<string | null>(null)

  async function respondToProposal(token: string, action: 'confirm' | 'decline') {
    setConfirming(token)
    await fetch('/api/listings/viewing-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action })
    })
    window.location.reload()
  }

  const filtered = viewings.filter(v => {
    if (tab === 'pending') return v.status === 'pending' || v.status === 'proposed'
    if (tab === 'confirmed') return v.status === 'confirmed'
    return true
  })

  const pendingCount = viewings.filter(v => v.status === 'pending' || v.status === 'proposed').length
  const confirmedCount = viewings.filter(v => v.status === 'confirmed').length

  if (viewings.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
        <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No viewing requests yet</h2>
      <p className="text-sm text-[#9B928E] mb-6">When you request a viewing on a property it will appear here.</p>
      <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <CalendarView viewings={viewings} />

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `All (${viewings.length})` },
          { key: 'pending', label: `Action needed (${pendingCount})` },
          { key: 'confirmed', label: `Confirmed (${confirmedCount})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={'px-4 py-2 rounded-xl text-sm font-medium transition-colors ' + (tab === t.key ? 'text-white' : 'bg-white border border-[#E8E2DA] text-[#3D3A38]')}
            style={tab === t.key ? { background: '#1B2E4B' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Viewing cards */}
      <div className="flex flex-col gap-4">
        {filtered.map(v => {
          const l = v.listings
          const img = l ? getImg(l.images) : null
          const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.pending

          return (
            <div key={v.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Property thumbnail */}
                <Link href={l ? '/listings/' + l.id : '#'} className="no-underline flex-shrink-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5EBE0]">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-[#C8C4BF]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                        </div>}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link href={l ? '/listings/' + l.id : '#'}
                      className="text-sm font-medium text-[#1B2E4B] hover:text-[#D3755A] transition-colors no-underline truncate">
                      {l?.address || 'Property'}
                    </Link>
                    <span className={'text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ' + cfg.bg + ' ' + cfg.text + ' ' + cfg.border}>
                      {cfg.label}
                    </span>
                  </div>
                  {l && (
                    <div className="text-xs text-[#9B928E] mb-2">
                      £{l.price?.toLocaleString()}/mo{l.bedrooms ? ' · ' + l.bedrooms + ' bed' : ''}{l.property_type ? ' · ' + l.property_type : ''}
                    </div>
                  )}
                  <div className="text-xs text-[#9B928E]">Requested {formatDate(v.created_at)}</div>
                </div>
              </div>

              <div className="px-4 pb-4 border-t border-[#F5F0EB] pt-3">
                {/* Pending — show submitted slots */}
                {v.status === 'pending' && (
                  <div>
                    <div className="text-xs text-[#9B928E] mb-2">Your availability submitted:</div>
                    <div className="flex flex-col gap-1">
                      {(v.slots || []).map((s, i) => (
                        <div key={i} className="text-xs text-[#1B2E4B] bg-[#F5EBE0] rounded-lg px-3 py-1.5">
                          {formatSlot(s)}
                        </div>
                      ))}
                    </div>
                    {v.message && <p className="text-xs text-[#9B928E] mt-2 italic">"{v.message}"</p>}
                  </div>
                )}

                {/* Proposed — owner has suggested a time, tenant needs to respond */}
                {v.status === 'proposed' && v.proposed_slot && (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">Owner proposed a time:</div>
                      <div className="text-sm text-blue-800 font-medium">{formatSlot(v.proposed_slot)}</div>
                      {v.proposed_slot.note && <div className="text-xs text-blue-600 mt-1 italic">Note: "{v.proposed_slot.note}"</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondToProposal(v.confirmation_token, 'confirm')}
                        disabled={confirming === v.confirmation_token}
                        className="flex-1 py-2 rounded-xl text-white text-xs font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                        style={{ background: '#1B2E4B' }}>
                        {confirming === v.confirmation_token ? 'Confirming…' : 'Confirm viewing ✓'}
                      </button>
                      <button onClick={() => respondToProposal(v.confirmation_token, 'decline')}
                        disabled={confirming === v.confirmation_token}
                        className="flex-1 py-2 rounded-xl border border-[#E8E2DA] text-xs text-[#9B928E] hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50">
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmed */}
                {v.status === 'confirmed' && v.proposed_slot && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-green-700 mb-1">Viewing confirmed</div>
                    <div className="text-sm text-green-800 font-medium">{formatSlot(v.proposed_slot)}</div>
                    <div className="text-xs text-green-600 mt-1">Add to your calendar and arrive on time.</div>
                  </div>
                )}

                {/* Cancelled */}
                {v.status === 'cancelled' && (
                  <div className="text-xs text-[#9B928E]">This viewing was cancelled.</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
