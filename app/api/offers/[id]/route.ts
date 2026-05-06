import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const ALLOWED = new Set(['new', 'viewed', 'accepted', 'rejected', 'withdrawn'])

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status } = body
  if (!status || !ALLOWED.has(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const sb = svc()

  // Verify the offer is on a listing this user owns/manages
  const { data: offer } = await sb.from('offers').select('id, listing_id').eq('id', id).maybeSingle()
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })

  const { data: listing } = await sb.from('listings').select('id, agent_id, raw_data').eq('id', offer.listing_id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Authorization: caller must be the agent (agency owner) OR an agency_agent member OR the listing owner
  let authorized = false
  if (listing.agent_id === user.id) authorized = true
  if (!authorized && listing.agent_id) {
    const { data: member } = await sb.from('agency_agents')
      .select('id').eq('agency_id', listing.agent_id).eq('auth_user_id', user.id).maybeSingle()
    if (member) authorized = true
  }
  if (!authorized) {
    const ownerEmail = listing.raw_data?.contact?.email
    if (ownerEmail && ownerEmail.toLowerCase() === (user.email || '').toLowerCase()) authorized = true
  }
  if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await sb.from('offers').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
