import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import NavAuthButton from '@/components/NavAuthButton'
import { getPublishedPost } from '@/lib/blog'
import ReactMarkdown from 'react-markdown'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const post = await getPublishedPost(supabase, slug)
  if (!post) return { title: 'Post not found — NestLondon' }
  return {
    title: (post.seo_title || post.title) + ' — NestLondon',
    description: post.seo_description || post.excerpt || undefined,
    openGraph: post.hero_image_url ? { images: [post.hero_image_url] } : undefined,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const post = await getPublishedPost(supabase, slug)
  if (!post) notFound()

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <article className="max-w-3xl mx-auto px-6 pt-10 pb-20">
        <Link href="/blog" className="text-sm text-[#D3755A] hover:underline mb-6 inline-block">
          ← Back to journal
        </Link>

        <header className="mb-10">
          {post.published_at && (
            <p className="text-sm text-stone-500 mb-3">
              {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {post.author ? ' · ' + post.author : ''}
            </p>
          )}
          <h1 className="text-4xl md:text-5xl font-light mb-4 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-[#4A5568] leading-relaxed">{post.excerpt}</p>
          )}
        </header>

        {post.hero_image_url && (
          <div className="rounded-2xl overflow-hidden mb-10 -mx-2 md:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.hero_image_url} alt="" className="w-full h-auto" />
          </div>
        )}

        <div className="prose prose-stone max-w-none text-[#4A5568] leading-relaxed
          prose-headings:font-light prose-headings:text-[#1C2B3A] prose-headings:[font-family:Georgia,serif]
          prose-a:text-[#D3755A] prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-xl prose-img:my-8
          prose-strong:text-[#1C2B3A]
          prose-blockquote:border-l-[#D3755A] prose-blockquote:bg-white prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg">
          <ReactMarkdown>{post.body}</ReactMarkdown>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-[#E8E2DA] flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white border border-[#E8E2DA] text-stone-600">
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </main>
  )
}
