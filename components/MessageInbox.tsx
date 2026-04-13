'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Thread {
  id: string
  thread_id: string
  listing_id: string
  from_user_id: string | null
  from_name: string
  from_email: string
  to_user_id: string | null
  body: string
  read_at: string | null
  created_at: string
  unread: number
  listings: { id: string; address: string; price: number; images: string } | null
}

interface Message {
  id: string
  thread_id: string
  from_user_id: string | null
  from_name: string
  body: string
  read_at: string | null
  created_at: string
}

interface Props { currentUserId: string }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getImg(images: any): string | null {
  try {
    const arr = typeof images === 'string' ? JSON.parse(images) : images || []
    return Array.isArray(arr) ? arr.find((u: string) => u?.startsWith('http')) || null : null
  } catch { return null }
}

export default function MessageInbox({ currentUserId }: Props) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchInbox() }, [])
  useEffect(() => { if (activeThread) fetchThread(activeThread) }, [activeThread])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchInbox() {
    setLoading(true)
    const res = await fetch('/api/messages?inbox=true')
    const data = await res.json()
    setThreads(data.threads || [])
    setLoading(false)
  }

  async function fetchThread(threadId: string) {
    const res = await fetch(`/api/messages?thread_id=${threadId}`)
    const data = await res.json()
    setMessages(data.messages || [])
    setThreads(ts => ts.map(t => t.thread_id === threadId ? { ...t, unread: 0 } : t))
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || !activeThread) return
    setSending(true)
    const thread = threads.find(t => t.thread_id === activeThread)
    if (!thread) { setSending(false); return }
    const toUserId = thread.from_user_id === currentUserId ? thread.to_user_id : thread.from_user_id
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: thread.listing_id, body: reply.trim(), thread_id: activeThread, to_user_id: toUserId }),
    })
    setReply('')
    await fetchThread(activeThread)
    setSending(false)
  }

  const totalUnread = threads.reduce((n, t) => n + (t.unread || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 border-2 border-[#D3755A] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (threads.length === 0) return (
    <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E2DA]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(211,117,90,0.10)' }}>
        <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>No messages yet</h2>
      <p className="text-sm text-[#9B928E] mb-6">When you message a property owner, your conversations will appear here.</p>
      <Link href="/search" className="px-6 py-3 rounded-xl text-white text-sm no-underline" style={{ background: '#D3755A' }}>Browse properties</Link>
    </div>
  )

  const activeThreadData = threads.find(t => t.thread_id === activeThread)

  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden" style={{ minHeight: '480px' }}>
      <div className="flex" style={{ minHeight: '480px' }}>
        <div className="w-72 flex-shrink-0 border-r border-[#F0EBE5] flex flex-col">
          <div className="px-4 py-3 border-b border-[#F0EBE5] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide">Messages</span>
            {totalUnread > 0 && <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full" style={{ background: '#D3755A' }}>{totalUnread}</span>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(t => {
              const img = t.listings ? getImg(t.listings.images) : null
              const isActive = t.thread_id === activeThread
              const otherName = t.from_user_id === currentUserId ? 'Owner' : t.from_name
              return (
                <button key={t.thread_id} onClick={() => setActiveThread(t.thread_id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b border-[#F8F5F2] ${isActive ? 'bg-[#FDF8F5]' : 'hover:bg-[#FAFAF9]'}`}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                    {img ? <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-stone-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5"/></svg>
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-semibold text-[#1B2E4B] truncate">{otherName}</span>
                      <span className="text-[10px] text-[#C8C4BF] flex-shrink-0">{timeAgo(t.created_at)}</span>
                    </div>
                    <div className="text-[10px] text-[#9B928E] truncate mt-0.5">{t.listings?.address || '—'}</div>
                    <div className={`text-xs truncate mt-0.5 ${t.unread > 0 ? 'font-semibold text-[#1B2E4B]' : 'text-[#9B928E]'}`}>{t.body}</div>
                  </div>
                  {t.unread > 0 && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#D3755A' }} />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-[#C8C4BF]">Select a conversation</div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-[#F0EBE5] flex items-center gap-3">
                {activeThreadData?.listings && (
                  <Link href={`/listings/${activeThreadData.listings.id}`}
                    className="text-sm font-medium text-[#1B2E4B] hover:text-[#D3755A] transition-colors no-underline truncate">
                    {activeThreadData.listings.address}
                  </Link>
                )}
                {activeThreadData?.listings?.price && (
                  <span className="text-xs text-[#9B928E] flex-shrink-0">£{activeThreadData.listings.price.toLocaleString()}/mo</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" style={{ maxHeight: '340px' }}>
                {messages.map(m => {
                  const isMine = m.from_user_id === currentUserId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
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
              <form onSubmit={sendReply} className="px-4 py-3 border-t border-[#F0EBE5] flex gap-2">
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Write a reply…"
                  className="flex-1 border border-[#E8E2DA] rounded-xl px-4 py-2 text-sm outline-none focus:border-[#D3755A] transition-colors bg-white placeholder-[#C8C4BF]"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as any) } }} />
                <button type="submit" disabled={sending || !reply.trim()}
                  className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90 flex-shrink-0"
                  style={{ background: '#D3755A' }}>
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
