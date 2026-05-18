import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import { runAudit, CONFIDENT_THRESHOLD, REVIEW_THRESHOLD } from '@/lib/dedupeAudit'
import NavAuthButton from '@/components/NavAuthButton'
import DedupeActions from '@/components/DedupeActions'

export const dynamic = 'force-dynamic'

export default async function AdminDedupePage() {
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

  // Only audit non-merged listings. Merged ones are by definition already handled.
  const { data: listings } = await svc
    .from('listings')
    .select('id, address, postcode, latitude, longitude, bedrooms, bathrooms, property_type, price, listing_type, raw_data, source, source_url, scraped_at, listed_at, is_active, is_direct')
    .is('canonical_listing_id', null)

  const audit = runAudit(listings || [])

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
              Duplicate detector
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {audit.totalListings} listings scanned · {audit.totalComparisons} pairs compared · {audit.confident.length} confident · {audit.review.length} to review
            </p>
          </div>
          <Link href="/admin/dedupe/log" className="text-sm text-[#D3755A] hover:underline">
            View merge history →
          </Link>
        </div>

        {/* Confident */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Confident duplicates (score ≥ {CONFIDENT_THRESHOLD})
          </h2>
          {audit.confident.length === 0 ? (
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8 text-center text-stone-500 text-sm">
              No confident duplicates found.
            </div>
          ) : (
            <div className="space-y-4">
              {audit.confident.map((s, i) => <DupeCard key={i} suggestion={s} bucket="confident" />)}
            </div>
          )}
        </section>

        {/* Review */}
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Needs review ({REVIEW_THRESHOLD} ≤ score &lt; {CONFIDENT_THRESHOLD})
          </h2>
          {audit.review.length === 0 ? (
            <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8 text-center text-stone-500 text-sm">
              No review-tier suggestions.
            </div>
          ) : (
            <div className="space-y-4">
              {audit.review.map((s, i) => <DupeCard key={i} suggestion={s} bucket="review" />)}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

// Server component — the visual comparison; action buttons are a client child component.
function DupeCard({ suggestion, bucket }: { suggestion: any; bucket: 'confident' | 'review' }) {
  const { a, b, score, breakdown } = suggestion
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E8E2DA] flex items-center justify-between bg-[#F8F4ED]/50">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${bucket === 'confident' ? 'bg-orange-50 text-orange-800 border border-orange-100' : 'bg-stone-100 text-stone-700 border border-stone-200'}`}>
            Score {score.toFixed(3)}
          </span>
          <span className="text-xs text-stone-500">
            addr={breakdown.address.toFixed(2)} · price={breakdown.price.toFixed(2)} · bed={breakdown.bedrooms.toFixed(2)} · size={breakdown.size.toFixed(2)} · geo={breakdown.geo == null ? '-' : breakdown.geo.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E8E2DA]">
        <ListingMini listing={a} label="A" />
        <ListingMini listing={b} label="B" />
      </div>
      <div className="px-5 py-3 border-t border-[#E8E2DA] bg-[#F8F4ED]/50">
        <DedupeActions
          listingAId={a.id}
          listingBId={b.id}
          score={score}
          recommendation={suggestion.recommendation}
        />
      </div>
    </div>
  )
}

function ListingMini({ listing, label }: { listing: any; label: string }) {
  const sizeText = listing.raw_data?.size_text || '—'
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-400">Listing {label}</span>
        <Link href={`/listings/${listing.id}`} target="_blank" className="text-xs text-[#D3755A] hover:underline">View →</Link>
      </div>
      <h3 className="text-sm font-semibold text-[#1C2B3A] mb-2">{listing.address || '(no address)'}</h3>
      <div className="text-xs text-stone-600 space-y-1">
        <div>£{listing.price?.toLocaleString()} · {listing.bedrooms}b · {listing.bathrooms}ba · {listing.property_type}</div>
        <div className="text-stone-400">{sizeText.replace('\n', ' · ')}</div>
        <div className="text-stone-400">{listing.source} · listed {listing.listed_at} · scraped {new Date(listing.scraped_at).toLocaleDateString('en-GB')}</div>
        <div className="text-stone-400 truncate" title={listing.source_url}>{listing.source_url}</div>
      </div>
    </div>
  )
}
