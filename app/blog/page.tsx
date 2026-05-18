import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import NavAuthButton from '@/components/NavAuthButton'
import { listPublishedPosts } from '@/lib/blog'

export const metadata = {
  title: 'Blog — NestLondon',
  description: 'Guides, market thinking, and neighbourhood deep-dives on London property.',
}

export const dynamic = 'force-dynamic'  // always fresh

export default async function BlogIndexPage() {
  // Use the anon client because RLS already filters to published posts.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const posts = await listPublishedPosts(supabase)

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-light mb-4 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            The <span className="italic" style={{ color: '#D3755A' }}>journal</span>
          </h1>
          <p className="text-lg text-[#4A5568] leading-relaxed max-w-2xl">
            Notes on London property, neighbourhoods, and how to navigate the market.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-12 text-center">
            <p className="text-[#4A5568]">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                {post.hero_image_url && (
                  <div className="h-56 overflow-hidden bg-[#E8E2DA]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.hero_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-6">
                  {post.published_at && (
                    <p className="text-xs text-stone-500 mb-2">
                      {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {post.author ? ' · ' + post.author : ''}
                    </p>
                  )}
                  <h2 className="text-xl font-semibold text-[#1C2B3A] mb-2 group-hover:text-[#D3755A] transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-[#4A5568] leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
