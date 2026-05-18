'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import type { BlogPost } from '@/lib/blog'

interface Props {
  /** When provided, form is in edit mode. When null, it's a new post. */
  post: BlogPost | null
}

interface FormState {
  title: string
  slug: string
  excerpt: string
  body: string
  hero_image_url: string
  author: string
  status: 'draft' | 'published'
  seo_title: string
  seo_description: string
  tagsText: string  // comma-separated, parsed on submit
}

function postToForm(p: BlogPost | null): FormState {
  return {
    title: p?.title || '',
    slug: p?.slug || '',
    excerpt: p?.excerpt || '',
    body: p?.body || '',
    hero_image_url: p?.hero_image_url || '',
    author: p?.author || '',
    status: p?.status || 'draft',
    seo_title: p?.seo_title || '',
    seo_description: p?.seo_description || '',
    tagsText: (p?.tags || []).join(', '),
  }
}

export default function BlogPostForm({ post }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(postToForm(post))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(status: 'draft' | 'published') {
    setBusy(true)
    setError(null)
    const payload = {
      title: form.title,
      slug: form.slug.trim() || undefined,  // backend slugifies if empty
      excerpt: form.excerpt || null,
      body: form.body,
      hero_image_url: form.hero_image_url || null,
      author: form.author || null,
      status,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      tags: form.tagsText.split(',').map(t => t.trim()).filter(Boolean),
    }

    try {
      const url = post ? `/api/admin/blog/${post.id}` : '/api/admin/blog'
      const method = post ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
        setBusy(false)
        return
      }
      router.push('/admin/blog')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!post) return
    if (!confirm('Permanently delete this post? This cannot be undone.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Delete failed')
        setBusy(false)
        return
      }
      router.push('/admin/blog')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
      setBusy(false)
    }
  }

  const inputClass = "w-full bg-white border border-[#E8E2DA] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D3755A] focus:border-transparent"
  const labelClass = "block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1"

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Form column */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className={inputClass}
            placeholder="A short, descriptive title"
          />
        </div>

        <div>
          <label className={labelClass}>Slug (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={e => set('slug', e.target.value)}
            className={inputClass}
            placeholder={post ? '' : 'Auto-generated from title if blank'}
          />
        </div>

        <div>
          <label className={labelClass}>Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={e => set('excerpt', e.target.value)}
            className={inputClass + ' resize-none'}
            rows={2}
            placeholder="One-line summary shown on the blog index"
          />
        </div>

        <div>
          <label className={labelClass}>Hero image URL</label>
          <input
            type="text"
            value={form.hero_image_url}
            onChange={e => set('hero_image_url', e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Author</label>
            <input
              type="text"
              value={form.author}
              onChange={e => set('author', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tags (comma separated)</label>
            <input
              type="text"
              value={form.tagsText}
              onChange={e => set('tagsText', e.target.value)}
              className={inputClass}
              placeholder="buying, neighbourhoods"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Body (markdown)</label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            className={inputClass + ' resize-none font-mono text-sm'}
            rows={20}
            placeholder="Write in markdown. Headings, **bold**, *italic*, [links](https://...), images (![alt](url)), > blockquotes, lists, etc."
          />
        </div>

        <details className="bg-white border border-[#E8E2DA] rounded-lg p-3">
          <summary className="text-xs font-semibold text-stone-500 uppercase tracking-wide cursor-pointer">SEO (optional)</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelClass}>SEO title</label>
              <input
                type="text"
                value={form.seo_title}
                onChange={e => set('seo_title', e.target.value)}
                className={inputClass}
                placeholder="Defaults to title"
              />
            </div>
            <div>
              <label className={labelClass}>SEO description</label>
              <textarea
                value={form.seo_description}
                onChange={e => set('seo_description', e.target.value)}
                className={inputClass + ' resize-none'}
                rows={2}
                placeholder="Defaults to excerpt"
              />
            </div>
          </div>
        </details>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E8E2DA]">
          <button
            type="button"
            disabled={busy || !form.title || !form.body}
            onClick={() => submit('draft')}
            className="px-5 py-2.5 bg-white border border-[#E8E2DA] rounded-lg text-sm font-medium hover:bg-[#F8F4ED] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={busy || !form.title || !form.body}
            onClick={() => submit('published')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#D3755A' }}
          >
            {post?.status === 'published' ? 'Update published' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(p => !p)}
            className="px-5 py-2.5 bg-white border border-[#E8E2DA] rounded-lg text-sm font-medium hover:bg-[#F8F4ED] ml-auto"
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          {post && (
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Preview column */}
      {showPreview && (
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white rounded-2xl border border-[#E8E2DA] p-6 max-h-[80vh] overflow-y-auto">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Preview</p>
            {form.hero_image_url && (
              <div className="rounded-xl overflow-hidden mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.hero_image_url} alt="" className="w-full h-auto" />
              </div>
            )}
            <h1 className="text-3xl font-light mb-3 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
              {form.title || 'Untitled'}
            </h1>
            {form.excerpt && <p className="text-base text-[#4A5568] mb-6 leading-relaxed">{form.excerpt}</p>}
            <div className="prose prose-stone max-w-none text-[#4A5568] leading-relaxed
              prose-headings:font-light prose-headings:text-[#1C2B3A] prose-headings:[font-family:Georgia,serif]
              prose-a:text-[#D3755A] prose-strong:text-[#1C2B3A]
              prose-img:rounded-xl prose-img:my-6">
              <ReactMarkdown>{form.body || '*Start writing in the body field...*'}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
