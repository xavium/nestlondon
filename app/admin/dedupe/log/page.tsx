import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import NavAuthButton from '@/components/NavAuthButton'
import DedupeUnmergeButton from '@/components/DedupeUnmergeButton'

export const dynamic = 'force-dynamic'

export default async function DedupeAuditLogPage() {
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

  // Load merge log + the addresses of the listings involved (best-effort join via two reads)
  const { data: logRows } = await svc
    .from('listing_merge_log')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(200)

  const ids = new Set<string>()
  for (const r of logRows || []) {
    if (r.canonical_listing_id) ids.add(r.canonical_listing_id)
    if (r.merged_listing_id) ids.add(r.merged_listing_id)
  }
  const { data: listingsData } = ids.size > 0
    ? await svc.from('listings').select('id, address, price').in('id', Array.from(ids))
    : { data: [] as any[] }
  const byId = new Map<string, any>()
  for (const l of listingsData || []) byId.set(l.id, l)

  // Determine which merge rows have NOT been unmerged. A merge is "active" if no
  // subsequent unmerge with the same (canonical_id, merged_id) pair exists.
  const unmergedKeys = new Set<string>()
  for (const r of logRows || []) {
    if (r.action === 'unmerge') unmergedKeys.add(`${r.canonical_listing_id}|${r.merged_listing_id}`)
  }

  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/admin/dedupe" className="text-sm text-[#D3755A] hover:underline mb-4 inline-block">
          ← Back to detector
        </Link>
        <h1 className="text-3xl font-light text-[#1C2B3A] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          Merge history
        </h1>

        {(!logRows || logRows.length === 0) ? (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8 text-center text-stone-500 text-sm">
            No merges or unmerges yet.
          </div>
        ) : (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F4ED] border-b border-[#E8E2DA]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">When</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Canonical</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Merged</th>
                  <th className="text-left px-5 py-3 font-semibold text-stone-500 text-xs uppercase tracking-wide">Score</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logRows.map(r => {
                  const canonical = byId.get(r.canonical_listing_id)
                  const merged = byId.get(r.merged_listing_id)
                  const key = `${r.canonical_listing_id}|${r.merged_listing_id}`
                  const isActiveMerge = r.action === 'merge' && !unmergedKeys.has(key)
                  return (
                    <tr key={r.id} className="border-b border-[#F0EBE3] last:border-b-0">
                      <td className="px-5 py-3 text-stone-500 text-xs whitespace-nowrap">
                        {new Date(r.performed_at).toLocaleString('en-GB')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.action === 'merge' ? 'bg-orange-50 text-orange-800 border border-orange-100' :
                          r.action === 'unmerge' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                          'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}>{r.action}</span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {canonical ? (
                          <Link href={`/listings/${r.canonical_listing_id}`} target="_blank" className="text-[#D3755A] hover:underline">
                            {canonical.address}
                          </Link>
                        ) : <span className="text-stone-400">(unknown)</span>}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {merged ? merged.address : <span className="text-stone-400">(unknown)</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-500">
                        {r.score ? r.score.toFixed(3) : '-'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isActiveMerge && <DedupeUnmergeButton mergeLogId={r.id} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
