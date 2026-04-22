'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  listingId: string
  address: string
}

type Mode = 'enquiry' | 'viewing'

function getNextTwoWeeks() {
  const days: { date: string; label: string }[] = []
  const today = new Date()
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    if (d.getDay() === 0) continue
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    days.push({ date: dateStr, label })
  }
  return days
}

const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM']

export default function ContactOwnerPanel({ listingId, address }: Props) {
  const [mode, setMode] = useState<Mode>('enquiry')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; time: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (!user) return
      setLoggedIn(true)
      setEmail(user.email || '')
      if (user.user_metadata?.name) setName(user.user_metadata.name)
      if (user.user_metadata?.phone) setPhone(user.user_metadata.phone)
    })
  }, [])

  const days = getNextTwoWeeks()
  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

  function toggleSlot(date: string, time: string) {
    const key = `${date}|${time}`
    const exists = selectedSlots.find(s => `${s.date}|${s.time}` === key)
    if (exists) {
      setSelectedSlots(s => s.filter(x => `${x.date}|${x.time}` !== key))
    } else if (selectedSlots.length < 3) {
      setSelectedSlots(s => [...s, { date, time }])
    }
  }

  function isSelected(date: string, time: string) {
    return !!selectedSlots.find(s => s.date === date && s.time === time)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'viewing' && selectedSlots.length === 0) {
      setError('Please select at least one availability slot')
      return
    }
    setLoading(true)
    setError('')
    try {
      // If not logged in, create account first so the enquiry/viewing is tied to them
      if (!loggedIn) {
        if (password.length < 8) throw new Error('Please create a password of at least 8 characters')
        const supabase = createClient()
        const { data: signupData, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, phone, role: 'resident' } }
        })
        const emailAlreadyExists = !signupErr && signupData?.user && Array.isArray(signupData.user.identities) && signupData.user.identities.length === 0
        if (signupErr || emailAlreadyExists) {
          const { error: signinErr } = await supabase.auth.signInWithPassword({ email, password })
          if (signinErr) {
            throw new Error('This email is already registered. Please use your existing password or sign in to continue.')
          }
        }
        // Wait a beat so the session cookie is set before the API call
        await new Promise(r => setTimeout(r, 200))
      }
      const endpoint = mode === 'viewing' ? '/api/listings/viewing-request' : '/api/listings/enquiry'
      const body = mode === 'viewing'
        ? { listing_id: listingId, tenant_name: name, tenant_email: email, tenant_phone: phone, message, slots: selectedSlots }
        : { listing_id: listingId, name, email, phone, message }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 sticky top-6 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(211,117,90,0.12)'}}>
        <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
      <h3 className="text-base font-light text-[#1B2E4B] mb-2" style={{fontFamily:'Georgia,serif'}}>
        {mode === 'viewing' ? 'Viewing request sent!' : 'Message sent!'}
      </h3>
      <p className="text-xs text-[#9B928E]">
        {mode === 'viewing'
          ? "The owner will review your availability and propose a time. We'll email you when they respond."
          : `Your message has been forwarded to the owner. They'll be in touch at ${email}.`}
      </p>
    </div>
  )

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 sticky top-6">
      <h3 className="text-base font-light text-[#1B2E4B] mb-1" style={{fontFamily:'Georgia,serif'}}>Contact the owner</h3>
      <p className="text-xs text-[#9B928E] mb-4">Direct listing — enquiries go straight to the owner</p>

      <div className="flex bg-[#F5EBE0] rounded-xl p-1 mb-5">
        <button onClick={() => setMode('enquiry')} type="button"
          className={'flex-1 py-2 text-xs rounded-lg transition-colors ' + (mode === 'enquiry' ? 'text-white' : 'text-[#9B928E]')}
          style={mode === 'enquiry' ? {background:'#D3755A'} : {}}>
          Request details
        </button>
        <button onClick={() => setMode('viewing')} type="button"
          className={'flex-1 py-2 text-xs rounded-lg transition-colors ' + (mode === 'viewing' ? 'text-white' : 'text-[#9B928E]')}
          style={mode === 'viewing' ? {background:'#1B2E4B'} : {}}>
          Book a viewing
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {loggedIn ? (
          <div className="bg-[#F5F0EB] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#D3755A] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{name || email}</span>
          </div>
        ) : (
          <>
            <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Your name" />
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="Email address" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="Phone (optional)" />
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} className={inputClass} placeholder="Password (new or existing account)" />
            <p className="text-xs text-[#9B928E] -mt-1">We'll create your NestLondon account or sign you in if you already have one.</p>
          </>
        )}

        {mode === 'enquiry' && (
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            className={inputClass + " min-h-24 resize-none"}
            placeholder="Hi, I'm interested in this property and would like to know more..." />
        )}

        {mode === 'viewing' && (
          <div>
            <div className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">
              Select up to 3 availability slots
              {selectedSlots.length > 0 && <span style={{color:'#D3755A'}}> ({selectedSlots.length}/3 selected)</span>}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
              {days.map(d => (
                <button key={d.date} type="button"
                  onClick={() => setSelectedDate(selectedDate === d.date ? null : d.date)}
                  className={'flex-shrink-0 px-3 py-2 rounded-xl text-xs border transition-colors ' +
                    (selectedDate === d.date ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
                  style={selectedDate === d.date ? {background:'#1B2E4B'} : {}}>
                  {d.label}
                </button>
              ))}
            </div>
            {selectedDate && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TIME_SLOTS.map(time => {
                  const sel = isSelected(selectedDate, time)
                  const maxed = selectedSlots.length >= 3 && !sel
                  return (
                    <button key={time} type="button"
                      onClick={() => !maxed && toggleSlot(selectedDate, time)}
                      disabled={maxed}
                      className={'px-3 py-1.5 rounded-lg text-xs border transition-colors ' +
                        (sel ? 'text-white border-transparent' : maxed ? 'border-[#E8E2DA] text-[#C8C4BF] cursor-not-allowed' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
                      style={sel ? {background:'#D3755A'} : {}}>
                      {time}
                    </button>
                  )
                })}
              </div>
            )}
            {selectedSlots.length > 0 && (
              <div className="bg-[#F5EBE0] rounded-xl p-3 mb-1">
                <div className="text-xs text-[#9B928E] mb-1.5">Your availability:</div>
                {selectedSlots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-[#1B2E4B] mb-1">
                    <span>{new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'})} at {s.time}</span>
                    <button type="button" onClick={() => toggleSlot(s.date, s.time)} className="text-[#9B928E] hover:text-red-500">✕</button>
                  </div>
                ))}
              </div>
            )}
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              className={inputClass + " min-h-16 resize-none mt-1"}
              placeholder="Any additional notes... (optional)" />
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{background: mode === 'viewing' ? '#1B2E4B' : '#D3755A'}}>
          {loading ? 'Sending...' : mode === 'viewing' ? 'Request viewing' : 'Send message'}
        </button>
      </form>
      <p className="text-xs text-[#9B928E] mt-3 text-center">NestLondon does not charge tenants any fees.</p>
    </div>
  )
}
