import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET /api/agency/invite/[token] — lookup invitation details
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
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

  // Look up the agency's name from user_metadata of the agency_id user
  const { data: agencyUser } = await sb.auth.admin.getUserById(member.agency_id)
  const agency_name = agencyUser?.user?.user_metadata?.agency_name || 'an agency'

  return NextResponse.json({
    invitation: {
      name: member.name,
      email: member.email,
      role: member.role,
      is_admin: member.is_admin,
      agency_name,
    }
  })
}

// POST /api/agency/invite/[token]/accept is routed via a separate file
