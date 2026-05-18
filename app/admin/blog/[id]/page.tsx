import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { getPostByIdAdmin } from '@/lib/blog'
import BlogPostForm from '@/components/BlogPostForm'
import NavAuthButton from '@/components/NavAuthButton'

export const dynamic = 'force-dynamic'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!isAdmin(user)) redirect('/')

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const post = await getPostByIdAdmin(svc, id)
  if (!post) notFound()

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-6">
        <Link href="/admin/blog" className="text-sm text-[#D3755A] hover:underline mb-4 inline-block">
          ← Back to admin
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            Edit post
          </h1>
          {post.status === 'published' && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="text-sm text-[#D3755A] hover:underline"
            >
              View live ↗
            </Link>
          )}
        </div>
        <BlogPostForm post={post} />
      </section>
    </main>
  )
}
