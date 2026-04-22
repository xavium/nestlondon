import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { resolveAgency } from '@/lib/agency'

async function getUser() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  return user
}
const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await resolveAgency(user.id)
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })

  const { name, email, role, is_admin, color } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
  }

  const { data: existing } = await svc()
    .from('agency_agents')
    .select('id, invitation_status')
    .eq('agency_id', ctx.agencyId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing && existing.invitation_status === 'pending') {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 })
  }

  const token = randomBytes(24).toString('hex')

  const { data, error } = await svc()
    .from('agency_agents')
    .insert({
      agency_id: ctx.agencyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'agent',
      color: color || null,
      is_admin: !!is_admin,
      invitation_token: token,
      invitation_status: 'pending',
      invited_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = req.nextUrl.origin
  const invite_url = `${origin}/auth/invite/${token}`

  return NextResponse.json({ agent: data, invite_url })
}
