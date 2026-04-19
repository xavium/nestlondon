import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import CreateListingForm from '@/components/CreateListingForm'

export default async function AgentListingPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/list/agent')

  const role = user.user_metadata?.role as string | undefined
  if (!role?.startsWith('agent') && role !== 'admin') redirect('/list')

  const defaultListingType = role === 'agent_sales' ? 'buy' : 'rent'
  const defaultName = (user.user_metadata?.agency_name as string) || (user.user_metadata?.name as string) || user.email || ""

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-white border-b border-[#E8E2DA]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <Link href="/dashboard?tab=listings" className="text-sm text-[#9B928E] hover:text-[#3D3A38]">← Back to dashboard</Link>
        </div>
      </nav>
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{color:'#D3755A'}}>Agent listing</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Add a listing</h1>
          <p className="text-sm text-[#3D3A38] mt-2">Add a property to your agency's portfolio. It'll appear on your dashboard immediately.</p>
        </div>
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8">
          <CreateListingForm lister="agent" defaultListingType={defaultListingType} defaultName={defaultName} defaultEmail={user.email || ""} defaultPhone={(user.user_metadata?.phone as string) || ""} />
        </div>
      </div>
    </main>
  )
}
