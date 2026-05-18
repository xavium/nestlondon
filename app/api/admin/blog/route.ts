import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/admin'
import { slugify } from '@/lib/blog'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, excerpt, body: postBody, hero_image_url, author, status, slug, seo_title, seo_description, tags } = body

    if (!title || !postBody) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
    }

    const finalSlug = slug?.trim() || slugify(title)
    const finalStatus = status === 'published' ? 'published' : 'draft'
    const publishedAt = finalStatus === 'published' ? new Date().toISOString() : null

    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await svc
      .from('blog_posts')
      .insert({
        title,
        slug: finalSlug,
        excerpt: excerpt || null,
        body: postBody,
        hero_image_url: hero_image_url || null,
        author: author || null,
        status: finalStatus,
        published_at: publishedAt,
        seo_title: seo_title || null,
        seo_description: seo_description || null,
        tags: Array.isArray(tags) ? tags : [],
      })
      .select('id, slug')
      .single()

    if (error) {
      // Friendly slug-collision message
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data.id, slug: data.slug })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Create failed' }, { status: 500 })
  }
}
