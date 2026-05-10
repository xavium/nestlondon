import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type Action = 'deactivate' | 'reactivate' | 'pause' | 'resubmit' | 'delete' | 'assign'

// State machine for status changes. Allowed source states for each action.
const ALLOWED: Record<string, string[]> = {
  deactivate: ['live'],
  reactivate: ['deactivated'],
  pause:      ['pending'],
  resubmit:   ['paused'],
}
const NEXT: Record<string, string> = {
  deactivate: 'deactivated',
  reactivate: 'live',
  pause:      'paused',
  resubmit:   'pending',
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id, action, assigned_agent_name } = await req.json() as { listing_id: string, action: Action, assigned_agent_name?: string }
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Ownership check (matches the dashboards' visibility logic)
    const { data: listing } = await svc.from('listings').select('agent_id, raw_data, source, status').eq('id', listing_id).maybeSingle()
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
    const isOwner = listing.agent_id === user.id || rd?.contact?.email?.toLowerCase() === user.email?.toLowerCase()
    if (!isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // State-machine actions
    if (action in ALLOWED) {
      const current = listing.status as string | null
      if (!current || !ALLOWED[action].includes(current)) {
        return NextResponse.json({ error: `Cannot ${action} a listing in status "${current ?? 'unknown'}"` }, { status: 400 })
      }
      const next = NEXT[action]
      const isActive = next === 'live'  // keep is_active in sync for backward compat
      const { error } = await svc.from('listings').update({ status: next, is_active: isActive }).eq('id', listing_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: next })
    }

    if (action === 'delete') {
      const { error } = await svc.from('listings').delete().eq('id', listing_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: 'deleted' })
    }

    if (action === 'assign') {
      const { error } = await svc.from('listings').update({
        assigned_agent_name: assigned_agent_name || null
      }).eq('id', listing_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, status: 'assigned' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
