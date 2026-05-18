/**
 * Blog data fetchers. Server-side only (use the server Supabase client at the call site).
 *
 * For the public site, we only show published posts whose published_at is in the past.
 * RLS policies enforce this at the DB level too — these helpers are defensive duplication.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  hero_image_url: string | null
  author: string | null
  status: 'draft' | 'published'
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

/**
 * List published posts, newest first. Used by the public /blog index.
 */
export async function listPublishedPosts(
  supabase: SupabaseClient
): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[blog] list error:', error.message)
    return []
  }
  return (data || []) as BlogPost[]
}

/**
 * Fetch a single published post by slug. Returns null if not found or not published.
 */
export async function getPublishedPost(
  supabase: SupabaseClient,
  slug: string
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()

  if (error) {
    console.error('[blog] get error:', error.message)
    return null
  }
  return data as BlogPost | null
}

/**
 * List ALL posts (draft + published). For the admin index only.
 * The caller MUST verify admin access before passing the service-role client.
 */
export async function listAllPostsAdmin(
  supabase: SupabaseClient
): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[blog] admin list error:', error.message)
    return []
  }
  return (data || []) as BlogPost[]
}

/**
 * Fetch any post by id (including drafts). For admin edit screen only.
 * The caller MUST verify admin access first.
 */
export async function getPostByIdAdmin(
  supabase: SupabaseClient,
  id: string
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[blog] admin get error:', error.message)
    return null
  }
  return data as BlogPost | null
}

/**
 * Generates a URL slug from a title.
 * "How to Buy a Flat in 2026!" -> "how-to-buy-a-flat-in-2026"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // strip punctuation
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse multi-hyphens
    .replace(/^-+|-+$/g, '')        // trim leading/trailing hyphens
}
