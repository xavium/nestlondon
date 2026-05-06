import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import OfferForm from '@/components/OfferForm'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/listings/${id}/offer`)

  const sb = svc()
  const { data: listing } = await sb
    .from('listings')
    .select('id, address, price, listing_type, bedrooms, property_type')
    .eq('id', id)
    .maybeSingle()

  if (!listing) notFound()

  const { data: renterProfile } = await sb
    .from('renter_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const offerType = listing.listing_type === 'buy' ? 'buy' : 'rent'

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-white border-b border-[#E8E2DA]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <Link href={`/listings/${id}`} className="text-sm text-[#9B928E] hover:text-[#3D3A38]">← Back to listing</Link>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#D3755A'}}>
            {offerType === 'buy' ? 'Submit an offer' : 'Submit a rental offer'}
          </p>
          <h1 className="text-3xl font-light text-[#1B2E4B] mb-1" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            {listing.address}
          </h1>
          <p className="text-sm text-[#9B928E]">
            Listed at £{listing.price?.toLocaleString()}{offerType === 'rent' ? '/mo' : ''}
            {listing.bedrooms != null ? ` · ${listing.bedrooms} bed` : ''}
            {listing.property_type ? ` · ${listing.property_type}` : ''}
          </p>
        </div>

        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-7">
          <OfferForm
            listingId={listing.id}
            offerType={offerType}
            listedPrice={listing.price}
            user={{
              email: user.email || '',
              name: (user.user_metadata?.name as string) || '',
              phone: (user.user_metadata?.phone as string) || (renterProfile?.phone as string) || '',
            }}
            profile={renterProfile}
          />
        </div>
      </div>
    </main>
  )
}
