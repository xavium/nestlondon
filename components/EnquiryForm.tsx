'use client'

import { useState } from 'react'

export default function EnquiryForm({ listingId, address }: { listingId: string, address: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Hi, I am interested in arranging a viewing of this property. Please let me know your availability.')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/listings/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, name, email, phone, message })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send enquiry')
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

  if (sent) return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 sticky top-6 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'rgba(211,117,90,0.12)'}}>
        <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
      <h3 className="text-base font-light text-[#1B2E4B] mb-1" style={{fontFamily:'Georgia,serif'}}>Enquiry sent</h3>
      <p className="text-xs text-[#9B928E]">The owner has been notified and will be in touch shortly. We've also sent a confirmation to {email}.</p>
    </div>
  )

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 sticky top-6">
      <h3 className="text-base font-light text-[#1B2E4B] mb-1" style={{fontFamily:'Georgia,serif'}}>Contact the owner</h3>
      <p className="text-xs text-[#9B928E] mb-5">Direct listing — enquiries go straight to the owner</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input required value={name} onChange={e => setName(e.target.value)}
          className={inputClass} placeholder="Your name" />
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
          className={inputClass} placeholder="Email address" />
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          className={inputClass} placeholder="Phone number (optional)" />
        <textarea required value={message} onChange={e => setMessage(e.target.value)}
          className={inputClass + " min-h-24 resize-none"} />
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{background:'#D3755A'}}>
          {loading ? 'Sending...' : 'Send enquiry'}
        </button>
      </form>
      <p className="text-xs text-[#9B928E] mt-3 text-center">NestLondon does not charge tenants any fees.</p>
    </div>
  )
}
