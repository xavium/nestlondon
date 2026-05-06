import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import OffersClient from './OffersClient'

export const dynamic = 'force-dynamic'

export default async function OffersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/offers')

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Fetch offers submitted by this user (matched by email since offers may be made when not logged in)
  const { data: offers } = await svc
    .from('offers')
    .select('*, listings(id, address, price, bedrooms, property_type, borough, images, listing_type, is_active)')
    .eq('offerer_email', user.email)
    .order('created_at', { ascending: false })

  // Fetch the most recent message thread per listing for this user (so we can link 'Message owner')
  const listingIds = (offers || []).map(o => o.listing_id).filter(Boolean)
  const threadByListing: Record<string, string> = {}
  if (listingIds.length > 0) {
    const { data: messages } = await svc
      .from('messages')
      .select('listing_id, thread_id, created_at')
      .in('listing_id', listingIds)
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    for (const m of messages || []) {
      if (!threadByListing[m.listing_id]) threadByListing[m.listing_id] = m.thread_id
    }
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
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Your offers</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Offers you've submitted</h1>
        </div>
        <OffersClient offers={offers || []} threadByListing={threadByListing} />
      </div>
    </main>
  )
}
