import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import BlogPostForm from '@/components/BlogPostForm'
import NavAuthButton from '@/components/NavAuthButton'

export const dynamic = 'force-dynamic'

export default async function NewBlogPostPage() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!isAdmin(user)) redirect('/')

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
        <h1 className="text-3xl font-light mb-6 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
          New post
        </h1>
        <BlogPostForm post={null} />
      </section>
    </main>
  )
}
