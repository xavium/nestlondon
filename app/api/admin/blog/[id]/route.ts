import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'

async function getAdminClient() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!isAdmin(user)) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const svc = await getAdminClient()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const { data, error } = await svc.from('blog_posts').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const svc = await getAdminClient()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params

  try {
    const body = await req.json()
    const update: any = {}
    // Whitelist editable fields
    for (const field of ['title', 'slug', 'excerpt', 'body', 'hero_image_url', 'author', 'seo_title', 'seo_description', 'tags']) {
      if (field in body) update[field] = body[field]
    }
    // Status transitions: on first transition to published, set published_at if not already set.
    if (body.status === 'published' || body.status === 'draft') {
      update.status = body.status
      if (body.status === 'published') {
        // Only set published_at if currently null (preserves original publish date on republish)
        const { data: current } = await svc.from('blog_posts').select('published_at').eq('id', id).maybeSingle()
        if (!current?.published_at) update.published_at = new Date().toISOString()
      }
    }

    const { error } = await svc.from('blog_posts').update(update).eq('id', id)
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const svc = await getAdminClient()
  if (!svc) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await ctx.params
  const { error } = await svc.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
