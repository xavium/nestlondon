import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
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

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ agents: [] })
  const ctx = await resolveAgency(user.id)
  if (!ctx) return NextResponse.json({ agents: [] })
  const { data } = await svc().from('agency_agents').select('*').eq('agency_id', ctx.agencyId).order('name')
  return NextResponse.json({ agents: data || [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await resolveAgency(user.id)
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: 'Only admins can add team members' }, { status: 403 })
  const { name, email, role, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const { data, error } = await svc().from('agency_agents')
    .insert({ agency_id: ctx.agencyId, name: name.trim(), email: email?.trim() || null, role: role || 'agent', color: color || null })
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await resolveAgency(user.id)
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: 'Only admins can remove team members' }, { status: 403 })
  const { id } = await req.json()
  await svc().from('agency_agents').delete().eq('id', id).eq('agency_id', ctx.agencyId)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await resolveAgency(user.id)
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: 'Only admins can modify team members' }, { status: 403 })
  const { id, name, email, role, color } = await req.json()
  const { error } = await svc().from('agency_agents')
    .update({ name, email, role, color })
    .eq('id', id).eq('agency_id', ctx.agencyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
