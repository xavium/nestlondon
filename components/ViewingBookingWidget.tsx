'use client'

import { useState } from 'react'

function getNextTwoWeeks() {
  const days = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: i === 0,
    })
  }
  return days
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

interface Props {
  listingId: string
  user: { name: string; email: string; phone?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ViewingBookingWidget({ listingId, user, onSuccess, onCancel }: Props) {
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; time: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const days = getNextTwoWeeks()

  function toggleSlot(date: string, time: string) {
    const key = date + '|' + time
    const exists = selectedSlots.find(s => (s.date + '|' + s.time) === key)
    if (exists) {
      setSelectedSlots(s => s.filter(x => (x.date + '|' + x.time) !== key))
    } else if (selectedSlots.length < 3) {
      setSelectedSlots(s => [...s, { date, time }])
    }
  }

  function isSelected(date: string, time: string) {
    return !!selectedSlots.find(s => s.date === date && s.time === time)
  }

  async function submit() {
    setError(null)
    if (selectedSlots.length === 0) { setError('Please select at least one time slot'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/listings/viewing-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          tenant_name: user.name,
          tenant_email: user.email,
          tenant_phone: user.phone || '',
          slots: selectedSlots,
          message,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
      onSuccess?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-[#FCFAF7] border border-[#E8E2DA] rounded-xl p-4 text-center">
        <p className="text-sm text-[#1B2E4B] mb-1">Viewing request sent</p>
        <p className="text-xs text-[#9B928E]">The owner will review your availability and propose a time.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#FCFAF7] border border-[#E8E2DA] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#1B2E4B]">Pick up to 3 time slots</h4>
        {onCancel && <button type="button" onClick={onCancel} className="text-[#9B928E] hover:text-[#1B2E4B] text-sm">×</button>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">{error}</div>}

      {/* Day picker */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {days.map(d => (
          <button key={d.date} type="button" onClick={() => setSelectedDate(d.date)}
            className={'flex-shrink-0 px-3 py-2 rounded-lg text-xs whitespace-nowrap border transition-colors ' + (selectedDate === d.date ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A] bg-white')}
            style={selectedDate === d.date ? {background:'#D3755A'} : {}}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Time picker */}
      {selectedDate && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 mb-3">
          {TIME_SLOTS.map(t => {
            const sel = isSelected(selectedDate, t)
            const disabled = !sel && selectedSlots.length >= 3
            return (
              <button key={t} type="button" disabled={disabled}
                onClick={() => toggleSlot(selectedDate, t)}
                className={'text-xs py-1.5 rounded-md border transition-colors ' + (sel ? 'text-white border-transparent' : disabled ? 'text-[#C8C4BF] border-[#F0EBE5] bg-white cursor-not-allowed' : 'text-[#3D3A38] border-[#E8E2DA] bg-white hover:border-[#D3755A]')}
                style={sel ? {background:'#1B2E4B'} : {}}>
                {t}
              </button>
            )
          })}
        </div>
      )}

      {/* Selected summary */}
      {selectedSlots.length > 0 && (
        <div className="text-xs text-[#9B928E] mb-3">
          Selected: {selectedSlots.map(s => {
            const day = days.find(d => d.date === s.date)
            return (day?.label || s.date) + ' ' + s.time
          }).join(', ')}
        </div>
      )}

      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
        className="w-full text-sm border border-[#E8E2DA] rounded-lg px-3 py-2 outline-none focus:border-[#D3755A] resize-none mb-3 bg-white"
        placeholder="Optional message…" />

      <div className="flex gap-2 flex-wrap">
        {onCancel && <button type="button" onClick={onCancel} className="flex-1 min-w-[80px] px-3 py-2 rounded-lg border border-[#E8E2DA] text-xs text-[#3D3A38]">Cancel</button>}
        <button type="button" onClick={submit} disabled={submitting || selectedSlots.length === 0}
          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-50"
          style={{background:'#1B2E4B'}}>
          {submitting ? 'Sending…' : 'Request viewing'}
        </button>
      </div>
    </div>
  )
}
