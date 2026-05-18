import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { listAllPostsAdmin } from '@/lib/blog'
import NavAuthButton from '@/components/NavAuthButton'

export const dynamic = 'force-dynamic'

export default async function AdminBlogIndexPage() {
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
  const posts = await listAllPostsAdmin(svc)

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
              Blog admin
            </h1>
            <p className="text-sm text-stone-500 mt-1">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
          </div>
          <Link
            href="/admin/blog/new"
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: '#D3755A' }}
          >
            New post
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-12 text-center">
            <p className="text-[#4A5568] mb-4">No posts yet.</p>
            <Link
              href="/admin/blog/new"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: '#D3755A' }}
            >
              Write your first post
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F4ED] border-b border-[#E8E2DA]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} className="border-b border-[#F0EBE3] last:border-b-0 hover:bg-[#F8F4ED]/40">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#1C2B3A]">{post.title}</div>
                      <div className="text-xs text-stone-400 mt-0.5">/{post.slug}</div>
                    </td>
                    <td className="px-5 py-4">
                      {post.status === 'published' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100">Published</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-600 border border-stone-200">Draft</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-stone-500 text-xs">
                      {new Date(post.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/admin/blog/${post.id}`} className="text-[#D3755A] hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
