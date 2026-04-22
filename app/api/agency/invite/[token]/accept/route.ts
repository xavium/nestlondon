import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// POST /api/agency/invite/[token]/accept — complete signup and link to agency_agents row
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const { password, specialism } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  const spec = specialism === 'sales' ? 'sales' : 'lettings'

  const sb = svc()
  const { data: member } = await sb
    .from('agency_agents')
    .select('id, name, email, role, is_admin, agency_id, invitation_status')
    .eq('invitation_token', token)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (member.invitation_status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already used or expired' }, { status: 410 })
  }

  // Create the auth user
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: member.email!,
    password,
    email_confirm: true,
    user_metadata: {
      name: member.name,
      role: `agent_${spec}`,
      invited_to_agency: member.agency_id,
    }
  })

  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message || 'Could not create account' }, { status: 500 })
  }

  // Link the auth user to the agency_agents row and mark accepted
  const { error: linkErr } = await sb
    .from('agency_agents')
    .update({
      auth_user_id: created.user.id,
      invitation_status: 'accepted',
      invitation_token: null,  // token is now consumed
    })
    .eq('id', member.id)

  if (linkErr) {
    // Rollback auth user on failure
    await sb.auth.admin.deleteUser(created.user.id).catch(() => {})
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
