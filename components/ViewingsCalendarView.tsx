'use client'
import { useState } from 'react'
import Link from 'next/link'

export interface Slot { date: string; time: string; note?: string }
export interface CalendarViewing {
  id: string
  listing_id: string
  status: string
  proposed_slot?: Slot
  slots?: Slot[]
  assigned_agent_name?: string | null
  agent_color?: string | null
  outcome?: 'completed' | 'not_completed' | null
  tenant_email?: string | null
  listings?: {
    address: string
    price: number
    bedrooms: number | null
    property_type: string | null
  } | null
}

function formatSlot(slot: Slot): string {
  const d = new Date(slot.date + 'T12:00:00')
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${dateStr} at ${slot.time}`
}

export default function ViewingsCalendarView({ viewings, onManage }: { viewings: CalendarViewing[]; onManage?: (v: CalendarViewing) => void }) {
  const [selectedViewing, setSelectedViewing] = useState<CalendarViewing | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [outcomes, setOutcomes] = useState<Record<string, 'completed' | 'not_completed' | null>>({})
  const [markingId, setMarkingId] = useState<string | null>(null)
  async function markOutcome(viewingId: string, outcome: 'completed' | 'not_completed' | null) {
    setMarkingId(viewingId)
    try {
      const res = await fetch('/api/listings/viewing-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewing_id: viewingId, outcome }),
      })
      if (res.ok) {
        setOutcomes(o => ({ ...o, [viewingId]: outcome }))
        if (selectedViewing?.id === viewingId) {
          setSelectedViewing({ ...selectedViewing, outcome })
        }
      }
    } finally {
      setMarkingId(null)
    }
  }

  const confirmed = viewings.filter(v => v.status === 'confirmed' && v.proposed_slot)
  const proposed = viewings.filter(v => v.status === 'proposed' && v.proposed_slot)
  const allCalendarViewings = [...confirmed, ...proposed].sort((a, b) =>
    new Date(a.proposed_slot!.date).getTime() - new Date(b.proposed_slot!.date).getTime()
  )

  // Pending viewings have multiple submitted slots — expand each slot into its own dot
  const pendingDots: { v: CalendarViewing; slot: Slot }[] = []
  for (const v of viewings) {
    if (v.status !== 'pending' || !v.slots) continue
    for (const s of v.slots) pendingDots.push({ v, slot: s })
  }

  const today = new Date()
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  // Build a calendar grid for viewMonth — always starts on a Monday.
  // Includes days from the previous month needed to fill the first row,
  // and from the next month to fill the last row (max 6 weeks).
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const firstWeekdayMondayIndex = (firstOfMonth.getDay() + 6) % 7 // Mon=0 .. Sun=6
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstWeekdayMondayIndex)

  const lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
  const lastWeekdayMondayIndex = (lastOfMonth.getDay() + 6) % 7
  const gridEnd = new Date(lastOfMonth)
  gridEnd.setDate(lastOfMonth.getDate() + (6 - lastWeekdayMondayIndex))

  const weeks: Date[][] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  function prevMonth() { setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMonth() { setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }
  function goToday() { setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)) }

  const monthLabel = viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const viewingsByDate: Record<string, CalendarViewing[]> = {}
  for (const v of allCalendarViewings) {
    const key = v.proposed_slot!.date
    if (!viewingsByDate[key]) viewingsByDate[key] = []
    viewingsByDate[key].push(v)
  }

  // Pending dots — keyed by date, each entry holds the viewing + the specific slot
  const pendingByDate: Record<string, { v: CalendarViewing; slot: Slot }[]> = {}
  for (const p of pendingDots) {
    if (!pendingByDate[p.slot.date]) pendingByDate[p.slot.date] = []
    pendingByDate[p.slot.date].push(p)
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-5 mb-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1B2E4B]">Calendar</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday}
            className="text-xs text-[#3D3A38] hover:text-[#D3755A] px-2 py-1 rounded-lg border border-[#E8E2DA] hover:border-[#D3755A] transition-colors">Today</button>
          <button type="button" onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E2DA] hover:border-[#D3755A] text-[#3D3A38] hover:text-[#D3755A] transition-colors">‹</button>
          <span className="text-xs font-medium text-[#1B2E4B] min-w-[96px] text-center">{monthLabel}</span>
          <button type="button" onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E8E2DA] hover:border-[#D3755A] text-[#3D3A38] hover:text-[#D3755A] transition-colors">›</button>
        </div>
      </div>
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
            const isOutsideMonth = day.getMonth() !== viewMonth.getMonth()
            return (
              <div key={di} className={'rounded-lg p-1 min-h-[52px] text-center ' + (isToday ? 'bg-[#F5EBE0]' : 'hover:bg-stone-50')}>
                <div className={'text-xs mb-1 ' + (isToday ? 'font-bold text-[#D3755A]' : isOutsideMonth ? 'text-[#E8E2DA]' : isPast ? 'text-[#C8C4BF]' : 'text-[#3D3A38]')}>
                  {day.getDate()}
                </div>
                {dayViewings.map(v => {
                  const c = v.agent_color || ''
                  const hasColor = !!c
                  const style = hasColor ? { background: c + '33', color: c, borderLeft: `3px solid ${c}` } : undefined
                  const fallback = v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  return (
                    <button key={v.id} onClick={() => { setSelectedViewing(v); setSelectedSlot(null) }}
                      className={'w-full text-[9px] px-1 py-0.5 rounded mb-0.5 truncate text-left cursor-pointer hover:opacity-80 transition-opacity ' + (hasColor ? '' : fallback)}
                      style={style}>
                      {v.proposed_slot!.time}
                    </button>
                  )
                })}
                {(pendingByDate[day.toISOString().slice(0,10)] || []).map((p, i) => (
                  <button key={'p-' + p.v.id + '-' + i} onClick={() => { setSelectedViewing(p.v); setSelectedSlot(p.slot) }}
                    className="w-full text-[9px] px-1 py-0.5 rounded mb-0.5 truncate text-left cursor-pointer hover:opacity-80 transition-opacity bg-amber-100 text-amber-700 border border-amber-200 border-dashed">
                    {p.slot.time}
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
                {formatSlot(selectedSlot || selectedViewing.proposed_slot!)}
              </div>
              {selectedViewing.assigned_agent_name && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/60">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: selectedViewing.agent_color || '#F5EBE0' }}>
                    <span className="text-[10px] font-medium text-white">{selectedViewing.assigned_agent_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9B928E]">Assigned agent</div>
                    <div className="text-xs font-medium text-[#1B2E4B]">{selectedViewing.assigned_agent_name}</div>
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const currentOutcome = outcomes[selectedViewing.id] ?? selectedViewing.outcome ?? null
              return (
                <div className="mb-3">
                  <div className="text-xs text-[#9B928E] mb-2">Mark outcome</div>
                  <div className="flex gap-2">
                    <button type="button" disabled={markingId === selectedViewing.id}
                      onClick={() => markOutcome(selectedViewing.id, currentOutcome === 'completed' ? null : 'completed')}
                      className={'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50 ' + (currentOutcome === 'completed' ? 'bg-green-600 text-white border-green-600' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-green-500 hover:text-green-600')}>
                      ✓ Completed
                    </button>
                    <button type="button" disabled={markingId === selectedViewing.id}
                      onClick={() => markOutcome(selectedViewing.id, currentOutcome === 'not_completed' ? null : 'not_completed')}
                      className={'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50 ' + (currentOutcome === 'not_completed' ? 'bg-red-600 text-white border-red-600' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-red-500 hover:text-red-600')}>
                      ✕ Not completed
                    </button>
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const v = selectedViewing
                  setSelectedViewing(null)
                  if (onManage) {
                    onManage(v)
                    return
                  }
                  setTimeout(() => {
                    const el = document.getElementById('viewing-' + v.id)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }, 100)
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#E8E2DA] text-xs text-[#3D3A38] text-center cursor-pointer hover:bg-[#F5EBE0] transition-colors">
                View listing
              </button>
              {selectedViewing.tenant_email && (
                <Link
                  href={'/messages?tenant_email=' + encodeURIComponent(selectedViewing.tenant_email) + '&listing_id=' + selectedViewing.listing_id}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs text-center transition-opacity hover:opacity-90 no-underline"
                  style={{background:'#D3755A'}}>
                  Message user
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
