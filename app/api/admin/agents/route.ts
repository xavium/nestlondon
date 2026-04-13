import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

async function getAdminUser() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') return null
  return user
}

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await req.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const api_key = crypto.randomBytes(32).toString('hex')
  const { data, error } = await svc()
    .from('agents')
    .insert({ name, email, api_key, is_active: true })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agent: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active, regenerate_key } = await req.json()
  const update: Record<string, any> = {}

  if (typeof is_active === 'boolean') update.is_active = is_active
  if (regenerate_key) {
    update.api_key = crypto.randomBytes(32).toString('hex')
  }

  const { data, error } = await svc()
    .from('agents')
    .update(update)
    .eq('id', id)
    .select('api_key')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, api_key: data?.api_key })
}
