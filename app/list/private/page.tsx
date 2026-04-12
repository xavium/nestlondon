import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import CreateListingForm from '@/components/CreateListingForm'

export default async function PrivateListingPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/list/auth?redirect=/list/private')

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-white border-b border-[#E8E2DA]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <Link href="/list" className="text-sm text-[#9B928E] hover:text-[#3D3A38]">← Change type</Link>
        </div>
      </nav>
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#D3755A'}}>Private owner</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>List your property</h1>
          <p className="text-sm text-[#3D3A38] mt-2">Free to list. No agent fees. Enquiries go directly to you.</p>
        </div>
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8">
          <CreateListingForm type="private" />
        </div>
      </div>
    </main>
  )
}
