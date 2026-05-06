import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import EnquiriesClient from './EnquiriesClient'

export const dynamic = 'force-dynamic'

export default async function EnquiriesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/enquiries')

  // Fetch all messages this user has sent, joined to listings.
  // Group by listing_id, keep most recent thread per listing.
  const { data: messages } = await supabase
    .from('messages')
    .select('id, listing_id, thread_id, body, created_at, listings(id, address, price, bedrooms, property_type, borough, images, is_active, listing_type)')
    .eq('from_user_id', user.id)
    .order('created_at', { ascending: false })

  // Dedupe: keep first (newest) message per listing
  const seen = new Set<string>()
  const enquiries: any[] = []
  for (const m of messages || []) {
    if (!m.listing_id || seen.has(m.listing_id)) continue
    seen.add(m.listing_id)
    enquiries.push(m)
  }

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton variant="dark" />
      </nav>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Your enquiries</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Properties you've enquired on</h1>
        </div>
        <EnquiriesClient enquiries={enquiries} />
      </div>
    </main>
  )
}
