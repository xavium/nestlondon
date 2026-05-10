import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import CreateListingForm from '@/components/CreateListingForm'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/list/auth?redirect=/list/edit/' + id)

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: listing } = await svc.from('listings').select('*').eq('id', id).single()
  if (!listing) notFound()
  if (!listing.is_direct) redirect('/dashboard')

  // Authorise: agent_id match OR raw_data.contact.email match
  const rd = typeof listing.raw_data === 'string' ? JSON.parse(listing.raw_data || '{}') : (listing.raw_data || {})
  const ownsByAgent = listing.agent_id === user.id
  const ownsByEmail = !!user.email && (rd?.contact?.email || '').toLowerCase() === user.email.toLowerCase()
  if (!ownsByAgent && !ownsByEmail) redirect('/dashboard')

  // Determine lister to switch form UX (private/agent)
  const role = user.user_metadata?.role as string | undefined
  const lister: 'private' | 'landlord' | 'agent' =
    role?.startsWith('agent') ? 'agent' :
    role === 'landlord' ? 'landlord' : 'private'

  // Build a CreateListingForm-compatible "existing" object from the listing row
  const existing = {
    id: listing.id,
    status: listing.status as string | null,
    address: listing.address || '',
    postcode: listing.postcode || '',
    property_type: listing.property_type || '',
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    square_feet: listing.square_feet,
    price: listing.price,
    description: listing.description || '',
    images: Array.isArray(listing.images) ? listing.images : (typeof listing.images === 'string' ? JSON.parse(listing.images || '[]') : []),
    floorplans: Array.isArray(rd?.floorplans) ? rd.floorplans : [],
    furnished: listing.furnished || '',
    listing_type: listing.listing_type || 'rent',
    which_floor: rd?.letting_details?.['Floor'] || '',
    total_floors: rd?.letting_details?.['Building floors'] || '',
    floor_layout: rd?.letting_details?.['Layout'] || '',
    epc_rating: rd?.letting_details?.['EPC Rating'] || '',
    council_tax_band: (rd?.letting_details?.['Council Tax'] || '').replace(/^Band\s+/, ''),
    deposit: (rd?.letting_details?.['Deposit'] || '').replace(/^£/, ''),
    available_from: rd?.letting_details?.['Available from'] || '',
    features: rd?.key_features || [],
    contact: rd?.contact || {},
  }

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-white border-b border-[#E8E2DA]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <Link href={lister === 'agent' ? '/dashboard?tab=listings' : '/dashboard/owner'} className="text-sm text-[#9B928E] hover:text-[#3D3A38] no-underline">← Back to dashboard</Link>
        </div>
      </nav>
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#D3755A'}}>Edit listing</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>{listing.address}</h1>
          <p className="text-sm text-[#3D3A38] mt-2">
            Saving changes will resubmit this listing for admin review. The listing will be hidden from the site until approved.
          </p>
        </div>
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8">
          <CreateListingForm
            lister={lister}
            defaultListingType={existing.listing_type as 'rent' | 'buy'}
            defaultName={existing.contact?.name || user.user_metadata?.name || ''}
            defaultEmail={existing.contact?.email || user.email || ''}
            defaultPhone={existing.contact?.phone || ''}
            existing={existing}
          />
        </div>
      </div>
    </main>
  )
}
