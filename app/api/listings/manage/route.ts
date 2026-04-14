import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

    const { listing_id, action, assigned_agent_name } = await req.json()
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Verify ownership
    const { data: listing } = await svc.from('listings').select('agent_id, raw_data, source').eq('id', listing_id).maybeSingle()
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
    const isOwner = listing.agent_id === user.id || rd?.contact?.email === user.email

    if (!isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    if (action === 'deactivate') {
      await svc.from('listings').update({ is_active: false }).eq('id', listing_id)
      return NextResponse.json({ success: true, status: 'deactivated' })
    }

    if (action === 'activate') {
      await svc.from('listings').update({ is_active: true }).eq('id', listing_id)
      return NextResponse.json({ success: true, status: 'activated' })
    }

    if (action === 'delete') {
      await svc.from('listings').delete().eq('id', listing_id)
      return NextResponse.json({ success: true, status: 'deleted' })
    }

    if (action === 'assign') {
      await svc.from('listings').update({
        assigned_agent_name: assigned_agent_name || null
      }).eq('id', listing_id)
      return NextResponse.json({ success: true, status: 'assigned' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
