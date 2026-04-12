'use client'

import Link from 'next/link'

export default function AgentDashboard({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-[#F5EBE0] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-2xl font-light text-[#1B2E4B] no-underline" style={{fontFamily:'Georgia,serif'}}>
            nest<span style={{color:'#D3755A'}} className="italic">london</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9B928E]">{email}</span>
            <a href="/api/auth/signout" className="text-xs text-[#9B928E] hover:text-[#3D3A38]">Sign out</a>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
            <div className="text-xs text-[#9B928E] mb-1 uppercase tracking-wide">Active listings</div>
            <div className="text-2xl text-[#1B2E4B]">0</div>
          </div>
          <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
            <div className="text-xs text-[#9B928E] mb-1 uppercase tracking-wide">Enquiries this week</div>
            <div className="text-2xl text-[#1B2E4B]">0</div>
          </div>
          <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
            <div className="text-xs text-[#9B928E] mb-1 uppercase tracking-wide">Total views</div>
            <div className="text-2xl text-[#1B2E4B]">0</div>
          </div>
        </div>
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6 text-center text-[#9B928E] text-sm">
          No listings yet. Once your properties are added they will appear here.
        </div>
      </div>
    </main>
  )
}
