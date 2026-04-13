'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  thread_id: string
  from_user_id: string | null
  from_name: string
  from_email: string
  to_user_id: string | null
  body: string
  read_at: string | null
  created_at: string
}

interface Props {
  listingId: string
  listingAddress: string
  currentUserId?: string | null
  initialThreadId?: string | null
  initialMessages?: Message[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function MessagesPanel({ listingId, listingAddress, currentUserId, initialThreadId, initialMessages = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [threadId, setThreadId] = useState<string | null>(initialThreadId || null)
  const [body, setBody] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(messages.length === 0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!threadId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages?thread_id=${threadId}`)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    }, 15000)
    return () => clearInterval(interval)
  }, [threadId])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, body: body.trim(), thread_id: threadId, from_name: name || undefined, from_email: email || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setThreadId(data.thread_id)
      setBody('')
      setShowForm(false)
      const threadRes = await fetch(`/api/messages?thread_id=${data.thread_id}`)
      const threadData = await threadRes.json()
      if (threadData.messages) setMessages(threadData.messages)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white placeholder-[#C8C4BF]'

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden sticky top-6">
      <div className="px-5 py-4 border-b border-[#F0EBE5] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Message the owner</h3>
          <p className="text-xs text-[#9B928E] mt-0.5">Direct listing · replies go straight to them</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setShowForm(s => !s)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#D3755A' }}>
            {showForm ? 'View thread' : 'New message'}
          </button>
        )}
      </div>

      {messages.length > 0 && !showForm && (
        <div className="px-4 py-3 flex flex-col gap-3 max-h-72 overflow-y-auto">
          {messages.map(m => {
            const isMine = m.from_user_id === currentUserId
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && <span className="text-[10px] text-[#9B928E] px-1">{m.from_name}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMine ? 'text-white rounded-tr-sm' : 'rounded-tl-sm border border-[#E8E2DA]'}`}
                    style={isMine ? { background: '#1B2E4B' } : { background: '#F5F0EB', color: '#1B2E4B' }}>
                    {m.body}
                  </div>
                  <span className="text-[10px] text-[#C8C4BF] px-1">{timeAgo(m.created_at)}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {(showForm || messages.length === 0) && (
        <form onSubmit={sendMessage} className="px-5 py-4 flex flex-col gap-3">
          {!currentUserId && (
            <>
              <input required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Your name" />
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="Your email" />
            </>
          )}
          <textarea required value={body} onChange={e => setBody(e.target.value)}
            className={inputClass + ' min-h-24 resize-none'}
            placeholder={messages.length > 0 ? 'Write a follow-up...' : `Hi, I'm interested in ${listingAddress}...`} />
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading || !body.trim()}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: '#D3755A' }}>
            {loading ? 'Sending…' : messages.length > 0 ? 'Send reply' : 'Send message'}
          </button>
        </form>
      )}
      <p className="text-[10px] text-[#C8C4BF] text-center pb-3 -mt-1">NestLondon does not charge tenants any fees.</p>
    </div>
  )
}
