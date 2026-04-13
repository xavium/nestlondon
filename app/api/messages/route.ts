import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

async function getAuthUser() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  return user
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('thread_id')
  const listingId = searchParams.get('listing_id')
  const inbox = searchParams.get('inbox')

  if (threadId) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('to_user_id', user.id)
      .is('read_at', null)

    return NextResponse.json({ messages: messages || [] })
  }

  if (listingId) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const threadMap = new Map<string, any>()
    for (const m of messages || []) {
      if (!threadMap.has(m.thread_id)) threadMap.set(m.thread_id, m)
    }
    return NextResponse.json({ threads: Array.from(threadMap.values()) })
  }

  if (inbox) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*, listings ( id, address, price, images )')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const threadMap = new Map<string, any>()
    const unreadCount = new Map<string, number>()

    for (const m of messages || []) {
      if (!threadMap.has(m.thread_id)) {
        threadMap.set(m.thread_id, m)
        unreadCount.set(m.thread_id, 0)
      }
      if (!m.read_at && m.to_user_id === user.id) {
        unreadCount.set(m.thread_id, (unreadCount.get(m.thread_id) || 0) + 1)
      }
    }

    const threads = Array.from(threadMap.values()).map(t => ({
      ...t,
      unread: unreadCount.get(t.thread_id) || 0,
    }))

    return NextResponse.json({ threads })
  }

  return NextResponse.json({ error: 'Missing query param' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  // Allow guest enquiries — user can be null

  const supabase = serviceClient()
  const { listing_id, body, to_user_id, thread_id, from_name, from_email } = await req.json()

  if (!listing_id || !body) {
    return NextResponse.json({ error: 'listing_id and body required' }, { status: 400 })
  }

  // For logged-in users, get profile; for guests use provided name/email
  let senderName = from_name || 'Guest'
  let senderEmail = from_email || ''

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle()
    senderName = from_name || profile?.name || user.email?.split('@')[0] || 'Unknown'
    senderEmail = from_email || profile?.email || user.email || ''
  }

  if (!senderName || !senderEmail) {
    return NextResponse.json({ error: 'Name and email required for guest enquiries' }, { status: 400 })
  }

  let recipientId = to_user_id
  if (!recipientId) {
    const { data: listing } = await supabase
      .from('listings')
      .select('agent_id')
      .eq('id', listing_id)
      .maybeSingle()
    recipientId = listing?.agent_id || null
  }

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      listing_id,
      from_user_id: user?.id ?? null,
      from_name: senderName,
      from_email: senderEmail,
      to_user_id: recipientId,
      body,
      thread_id: thread_id || '00000000-0000-0000-0000-000000000000',
    })
    .select('id')
    .single()

  if (error || !msg) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })

  const finalThreadId = thread_id || msg.id
  if (!thread_id) {
    await supabase.from('messages').update({ thread_id: finalThreadId }).eq('id', msg.id)
  }

  if (process.env.RESEND_API_KEY && recipientId) {
    const { data: recipientProfile } = await supabase
      .from('users').select('email, name').eq('id', recipientId).maybeSingle()

    if (recipientProfile?.email) {
      const { data: listing } = await supabase
        .from('listings').select('address').eq('id', listing_id).maybeSingle()

      const threadUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?tab=messages&thread=${finalThreadId}`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'NestLondon <onboarding@resend.dev>',
          to: recipientProfile.email,
          reply_to: senderEmail,
          subject: `New message about ${listing?.address || 'your property'}`,
          text: `Hi ${recipientProfile.name || 'there'},\n\nNew message from ${senderName}:\n\n"${body}"\n\nReply at: ${threadUrl}\n\n— NestLondon`,
        }),
      })
    }
  }

  return NextResponse.json({ success: true, thread_id: finalThreadId, message_id: msg.id })
}
