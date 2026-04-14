import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET — fetch all hidden listing IDs for user
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ ids: [] })
  const { data } = await svc().from('hidden_listings').select('listing_id').eq('user_id', user.id)
  return NextResponse.json({ ids: data?.map(r => r.listing_id) || [] })
}

// POST — hide a listing
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { listing_id } = await req.json()
  await svc().from('hidden_listings').upsert({ user_id: user.id, listing_id }, { onConflict: 'user_id,listing_id' })
  return NextResponse.json({ success: true })
}

// DELETE — unhide (single or all)
export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { listing_id } = await req.json()
  if (listing_id) {
    await svc().from('hidden_listings').delete().eq('user_id', user.id).eq('listing_id', listing_id)
  } else {
    await svc().from('hidden_listings').delete().eq('user_id', user.id)
  }
  return NextResponse.json({ success: true })
}
