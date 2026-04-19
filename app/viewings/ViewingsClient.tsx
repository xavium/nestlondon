'use client'

import { useState } from 'react'
import Link from 'next/link'
import MessagesPanel from '@/components/MessagesPanel'

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
  confirmed_address?: string | null
  created_at: string
  listings: {
    id: string
    address: string
    price: number
    images: string
    property_type: string | null
    bedrooms: number | null
    raw_data: any
    agent_id: string | null
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
  const [selectedViewing, setSelectedViewing] = useState<Viewing | null>(null)

  const confirmed = viewings.filter(v => v.status === 'confirmed' && v.proposed_slot)
  const proposed = viewings.filter(v => v.status === 'proposed' && v.proposed_slot)
  const upcoming = [...confirmed, ...proposed].sort((a, b) =>
    new Date(a.proposed_slot!.date).getTime() - new Date(b.proposed_slot!.date).getTime()
  )


  const today = new Date()
  const weeks: Date[][] = []
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + 1)

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
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 mb-5 relative">
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
              <div key={di} className={'rounded-lg p-1 min-h-[52px] text-center ' + (isToday ? 'bg-[#F5EBE0]' : isPast ? '' : 'hover:bg-stone-50')}>
                <div className={'text-xs mb-1 ' + (isToday ? 'font-bold text-[#D3755A]' : isPast ? 'text-[#C8C4BF]' : 'text-[#3D3A38]')}>
                  {day.getDate()}
                </div>
                {dayViewings.map(v => (
                  <button key={v.id} onClick={() => setSelectedViewing(v)}
                    className={'w-full text-[9px] px-1 py-0.5 rounded mb-0.5 truncate text-left cursor-pointer hover:opacity-80 transition-opacity ' +
                      (v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {v.proposed_slot!.time}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
      <div className="flex gap-3 mt-3 pt-3 border-t border-[#F0EBE5]">
        <div className="flex items-center gap-1.5 text-xs text-[#9B928E]"><div className="w-3 h-3 rounded bg-green-100" />Confirmed</div>
        <div className="flex items-center gap-1.5 text-xs text-[#9B928E]"><div className="w-3 h-3 rounded bg-blue-100" />Proposed</div>
      </div>

      {/* Popup */}
      {selectedViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.4)'}} onClick={() => setSelectedViewing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className={'text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ' +
                  (selectedViewing.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
                  {selectedViewing.status === 'confirmed' ? 'Confirmed' : 'Proposed'}
                </div>
                <h3 className="text-base font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>
                  {selectedViewing.listings?.address || 'Property viewing'}
                </h3>
              </div>
              <button onClick={() => setSelectedViewing(null)} className="text-[#9B928E] hover:text-[#1B2E4B] text-lg leading-none ml-4">✕</button>
            </div>

            {selectedViewing.listings && (
              <div className="text-xs text-[#9B928E] mb-3">
                £{selectedViewing.listings.price?.toLocaleString()}/mo
                {selectedViewing.listings.bedrooms ? ' · ' + selectedViewing.listings.bedrooms + ' bed' : ''}
                {selectedViewing.listings.property_type ? ' · ' + selectedViewing.listings.property_type : ''}
              </div>
            )}

            <div className="bg-[#F5EBE0] rounded-xl p-4 mb-4">
              <div className="text-xs text-[#9B928E] mb-1">Date & time</div>
              <div className="text-sm font-medium text-[#1B2E4B]">
                {formatSlot(selectedViewing.proposed_slot!)}
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={'/listings/' + selectedViewing.listing_id} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] text-center no-underline hover:bg-[#F5EBE0] transition-colors">
                View property
              </Link>
              <button
                onClick={() => {
                  setSelectedViewing(null)
                  setTimeout(() => {
                    const el = document.getElementById('viewing-' + selectedViewing.id)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-xs text-center transition-opacity hover:opacity-90"
                style={{background:'#D3755A'}}>
                Manage viewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ViewingsClient({ viewings, currentUserId }: { viewings: Viewing[], currentUserId: string }) {
  const [tab, setTab] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [amendingId, setAmendingId] = useState<string | null>(null)
  const [amendMessage, setAmendMessage] = useState('')
  const [amendDate, setAmendDate] = useState('')
  const [amendTime, setAmendTime] = useState('10:00 AM')
  const [actioning, setActioning] = useState(false)
  const [messagingId, setMessagingId] = useState<string | null>(null)

  async function respondToProposal(token: string, action: 'confirm' | 'decline') {
    setConfirming(token)
    await fetch('/api/listings/viewing-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action })
    })
    window.location.reload()
  }

  async function cancelViewing(id: string) {
    if (!confirm('Cancel this viewing request?')) return
    setCancelling(id)
    await fetch('/api/listings/viewing-amend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewing_id: id, action: 'cancel' })
    })
    window.location.reload()
  }

  async function requestAmendment(id: string) {
    setActioning(true)
    const new_slots = amendDate ? [{ date: amendDate, time: amendTime }] : undefined
    await fetch('/api/listings/viewing-amend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewing_id: id, action: 'request_amendment', message: amendMessage, new_slots })
    })
    setAmendingId(null)
    setAmendMessage('')
    setAmendDate('')
    setAmendTime('10:00 AM')
    setActioning(false)
    window.location.reload()
  }

  const filtered = viewings.filter(v => {
    if (tab === 'pending') return v.status === 'pending' || v.status === 'proposed'
    if (tab === 'confirmed') return v.status === 'confirmed'
    return true
  })

  const pendingCount = viewings.filter(v => v.status === 'pending' || v.status === 'proposed').length
  const confirmedCount = viewings.filter(v => v.status === 'confirmed').length

  return (
    <div className="flex flex-col gap-5">
      <CalendarView viewings={viewings} />
      {viewings.length === 0 && (
        <div className="text-center py-10 bg-white rounded-2xl border border-[#E8E2DA]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
            <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No viewing requests yet</h2>
          <p className="text-sm text-[#9B928E] mb-6">When you request a viewing on a property it will appear here.</p>
          <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties →</Link>
        </div>
      )}

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
            <div key={v.id} id={'viewing-' + v.id} className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden transition-all">
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
                    <div className="text-sm text-green-800 font-medium mb-1">{formatSlot(v.proposed_slot)}</div>
                    {v.confirmed_address ? (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <div className="text-xs text-green-600 mb-0.5">Full address</div>
                        <div className="text-sm text-green-800 font-medium">{v.confirmed_address}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 mt-1">Full address will be confirmed by the owner.</div>
                    )}
                    {(() => {
                      const rd = v.listings?.raw_data
                      const raw = typeof rd === 'string' ? (() => { try { return JSON.parse(rd) } catch { return {} } })() : (rd || {})
                      const contact = raw?.contact || {}
                      const hasContact = contact.name || contact.email || contact.phone
                      if (!hasContact) return null
                      return (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <div className="text-xs text-green-600 mb-1.5">Owner / agent contact</div>
                          {contact.name && <div className="text-sm text-green-800 font-medium">{contact.name}</div>}
                          {contact.phone && (
                            <a href={'tel:' + contact.phone} className="text-xs text-green-700 hover:underline flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={'mailto:' + contact.email} className="text-xs text-green-700 hover:underline flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {contact.email}
                            </a>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Cancelled */}
                {v.status === 'cancelled' && (
                  <div className="text-xs text-[#9B928E]">This viewing was cancelled.</div>
                )}

                {/* Cancel / Amend actions for active viewings */}
                {v.status !== 'cancelled' && (
                  <div className="mt-3 pt-3 border-t border-[#F5F0EB]">
                    {amendingId === v.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-medium text-[#9B928E] uppercase tracking-wide">Suggest a new time (optional)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={amendDate} onChange={e => setAmendDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="border border-[#E8E2DA] rounded-xl px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white" />
                          <select value={amendTime} onChange={e => setAmendTime(e.target.value)}
                            className="border border-[#E8E2DA] rounded-xl px-3 py-1.5 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white">
                            {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <textarea value={amendMessage} onChange={e => setAmendMessage(e.target.value)}
                          placeholder="Any additional notes..."
                          className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2 text-xs text-[#1B2E4B] outline-none focus:border-[#D3755A] resize-none min-h-14 bg-white" />
                        <div className="flex gap-2">
                          <button onClick={() => { setAmendingId(null); setAmendMessage(''); setAmendDate(''); setAmendTime('10:00 AM') }}
                            className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#9B928E]">Cancel</button>
                          <button onClick={() => requestAmendment(v.id)} disabled={actioning}
                            className="flex-1 py-1.5 rounded-xl text-white text-xs disabled:opacity-50"
                            style={{ background: '#D3755A' }}>
                            {actioning ? 'Sending…' : 'Send request'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const slot = v.proposed_slot || (v.slots?.[0])
                          setAmendingId(v.id)
                          setAmendDate(slot?.date || '')
                          setAmendTime(slot?.time || '10:00 AM')
                        }}
                          className="flex-1 py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors">
                          Request amendment
                        </button>
                        <button onClick={() => cancelViewing(v.id)} disabled={cancelling === v.id}
                          className="flex-1 py-1.5 rounded-xl border border-red-200 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                          {cancelling === v.id ? 'Cancelling…' : 'Cancel viewing'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Message owner */}
                {v.status !== 'cancelled' && (
                  <div className="mt-2">
                    {messagingId === v.id ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-[#1B2E4B]">Message the owner</span>
                          <button onClick={() => setMessagingId(null)} className="text-xs text-[#9B928E] hover:text-[#1B2E4B]">✕ Close</button>
                        </div>
                        <MessagesPanel
                          listingId={v.listing_id}
                          listingAddress={v.listings?.address || ''}
                          currentUserId={currentUserId}
                        />
                      </div>
                    ) : (
                      <button onClick={() => setMessagingId(v.id)}
                        className="w-full py-1.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Message owner
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
