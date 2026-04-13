import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#F5EBE0] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <h1 className="text-3xl font-light text-[#1B2E4B] mt-6 mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Create your account</h1>
          <p className="text-sm text-[#9B928E]">Choose the option that best describes you</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Looking for a home */}
          <Link href="/auth/signup?role=resident" className="group bg-white border border-[#E8E2DA] rounded-2xl p-7 hover:shadow-lg hover:border-[#D3755A] transition-all no-underline">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(211,117,90,0.12)'}}>
              <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>I am looking for a home</h2>
            <p className="text-sm text-[#3D3A38] leading-relaxed mb-4">Search listings, save properties, set alerts and message owners directly.</p>
            <div className="flex flex-col gap-1.5">
              {['Save properties', 'Email alerts', 'Message owners'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-5 text-sm font-medium group-hover:underline" style={{color:'#D3755A'}}>Get started →</div>
          </Link>

          {/* Private owner / Landlord */}
          <Link href="/list/auth?redirect=/list" className="group bg-white border border-[#E8E2DA] rounded-2xl p-7 hover:shadow-lg hover:border-[#D3755A] transition-all no-underline">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(211,117,90,0.12)'}}>
              <svg className="w-6 h-6" fill="none" stroke="#D3755A" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>I have a home to sell or let</h2>
            <p className="text-sm text-[#3D3A38] leading-relaxed mb-4">List your property directly on NestLondon and receive enquiries from residents and buyers.</p>
            <div className="flex flex-col gap-1.5">
              {['Free to list', 'No agent fees', 'Direct enquiries'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-5 text-sm font-medium group-hover:underline" style={{color:'#D3755A'}}>List your property →</div>
          </Link>

          {/* Letting agent */}
          <Link href="/auth/signup?role=agent" className="group bg-white border border-[#E8E2DA] rounded-2xl p-7 hover:shadow-lg hover:border-[#1B2E4B] transition-all no-underline">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{background:'rgba(27,46,75,0.08)'}}>
              <svg className="w-6 h-6" fill="none" stroke="#1B2E4B" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>I am an agent</h2>
            <p className="text-sm text-[#3D3A38] leading-relaxed mb-4">Manage listings on behalf of landlords with a professional agency dashboard.</p>
            <div className="flex flex-col gap-1.5">
              {['Agency dashboard', 'Multiple properties', 'Professional tools'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-[#3D3A38]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#1B2E4B" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-5 text-sm font-medium text-[#1B2E4B] group-hover:underline">Register as agent →</div>
          </Link>

        </div>

        <p className="text-center text-xs text-[#9B928E] mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline" style={{color:'#D3755A'}}>Sign in</Link>
        </p>
      </div>
    </main>
  )
}
