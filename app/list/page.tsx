import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function ListPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.full_name || user?.email || null
  const userRole = user?.user_metadata?.role || null
  const isResident = user && (userRole === 'resident' || userRole === 'tenant')

  if (isResident) return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
          nest<span style={{color:'#D3755A'}} className="italic">london</span>
        </Link>
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-8 mt-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{background:'rgba(211,117,90,0.10)'}}>
            <svg className="w-7 h-7" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            Owner or agent account needed
          </h1>
          <p className="text-sm text-[#9B928E] leading-relaxed mb-6">
            You're currently signed in as a resident. To list a property you need an owner or agent account.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/register"
              className="block w-full py-3 rounded-xl text-white text-sm font-medium text-center no-underline transition-opacity hover:opacity-90"
              style={{background:'#D3755A'}}>
              Create an owner or agent account →
            </Link>
            <Link href="/auth/login"
              className="block w-full py-3 rounded-xl text-sm font-medium text-center no-underline border border-[#E8E2DA] text-[#1B2E4B] hover:bg-[#F5EBE0] transition-colors">
              Sign in to an existing owner account
            </Link>
          </div>
          <p className="text-xs text-[#9B928E] mt-5">
            Your resident account and saved properties are not affected.
          </p>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-white border-b border-[#E8E2DA]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          <Link href="/" className="text-xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{color:'#D3755A'}}>List your property</p>
          <h1 className="text-4xl font-light text-[#1B2E4B] mb-4" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            Who are you listing as?
          </h1>
          <p className="text-[#3D3A38] text-sm">Choose the option that best describes you. Both are free to list.</p>
          {userName && <p className="text-sm text-[#D3755A] mt-2">Welcome back, {userName} ✓</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Owner */}
          <Link href="/list/private" className="group bg-white border border-[#E8E2DA] rounded-2xl p-8 hover:shadow-lg hover:border-[#D3755A] transition-all no-underline">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(211,117,90,0.12)'}}>
              <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>I am an owner</h2>
            <p className="text-sm text-[#3D3A38] leading-relaxed mb-5">You own the property and want to rent or sell it directly — no agent involved.</p>
            <div className="flex flex-col gap-2">
              {['No agent fees', 'Direct enquiries to you', 'Full control over your listing'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm font-medium group-hover:underline" style={{color:'#D3755A'}}>Start listing →</div>
          </Link>

          {/* Agent */}
          <Link href="/auth/login?redirect=/dashboard" className="group bg-white border border-[#E8E2DA] rounded-2xl p-8 hover:shadow-lg hover:border-[#1B2E4B] transition-all no-underline">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(27,46,75,0.08)'}}>
              <svg className="w-6 h-6" fill="none" stroke="#1B2E4B" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>I am an agent</h2>
            <p className="text-sm text-[#3D3A38] leading-relaxed mb-5">You're a professional letting agent managing listings on behalf of landlords.</p>
            <div className="flex flex-col gap-2">
              {['BLM feed integration', 'Manage multiple properties', 'Professional dashboard'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#1B2E4B" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm font-medium text-[#1B2E4B] group-hover:underline">Sign in as agent →</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
