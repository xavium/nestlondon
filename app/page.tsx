'use client'

import SearchBarClient from '@/components/SearchBarClient'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F1EFE8]">
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <a href="/" className="text-xl font-light text-stone-800 flex-shrink-0" style={{fontFamily:'Georgia,serif'}}>
            nest<span className="text-orange-700 italic">london</span>
          </a>
        </div>
      </nav>
      <div className="bg-white border-b border-stone-100 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest text-stone-400 uppercase mb-3">London property search</p>
          <h1 className="text-4xl font-light text-stone-800 mb-2 leading-tight" style={{fontFamily:'Georgia,serif'}}>
            Find your next home<br/>across <em className="text-orange-700">all of London</em>
          </h1>
          <p className="text-stone-500 text-sm mb-8">Listings from every major portal, in one place.</p>
          <SearchBarClient location="" listingType="rent" minBeds={null} maxPrice={null} />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs text-stone-400 text-center">Aggregating listings from Rightmove, Zoopla and OnTheMarket</p>
      </div>
    </main>
  )
}
