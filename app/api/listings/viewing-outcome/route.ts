import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { resolveAgency } from '@/lib/agency'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { viewing_id, outcome } = await req.json()
    if (!viewing_id) return NextResponse.json({ error: 'viewing_id required' }, { status: 400 })
    if (outcome !== null && outcome !== 'completed' && outcome !== 'not_completed') {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }

    const sb = svc()
    // Load the viewing + its listing to verify permission
    const { data: viewing } = await sb
      .from('viewing_requests')
      .select('*, listings(agent_id, raw_data)')
      .eq('id', viewing_id)
      .maybeSingle()

    if (!viewing) return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })

    // Permission: user is either the agency (any agent in the agency) or the owner of the listing
    const listing: any = viewing.listings
    const listingAgentId = listing?.agent_id as string | null
    const ownerEmail = listing?.raw_data?.contact?.email as string | undefined

    const ctx = await resolveAgency(user.id)
    const isAgencyMember = !!(listingAgentId && ctx && ctx.agencyId === listingAgentId)
    const isOwnerOfListing = !!(ownerEmail && user.email && ownerEmail.toLowerCase() === user.email.toLowerCase())

    if (!isAgencyMember && !isOwnerOfListing) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const update: any = {
      outcome,
      outcome_marked_at: outcome ? new Date().toISOString() : null,
      outcome_marked_by: outcome ? user.id : null,
    }
    const { error } = await sb.from('viewing_requests').update(update).eq('id', viewing_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, outcome })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
