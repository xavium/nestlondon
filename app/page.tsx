'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [location, setLocation] = useState('')
  const [type, setType] = useState('rent')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location) params.set('location', location)
    params.set('type', type)
    router.push('/search?' + params.toString())
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 px-6 h-14 flex items-center justify-between">
        <div className="text-xl font-light text-stone-800" style={{fontFamily:'Georgia,serif'}}>
          nest<span className="text-green-800 italic">london</span>
        </div>
        <div className="flex gap-6 text-sm text-stone-500">
          <span className="cursor-pointer hover:text-stone-800">Buy</span>
          <span className="cursor-pointer hover:text-stone-800">Rent</span>
          <span className="cursor-pointer hover:text-stone-800">For agents</span>
        </div>
      </nav>
      <div className="bg-white border-b border-stone-100 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs tracking-widest text-stone-400 uppercase mb-3">London property search</p>
          <h1 className="text-4xl font-light text-stone-800 mb-2 leading-tight" style={{fontFamily:'Georgia,serif'}}>
            Find your next home<br/>across <em className="text-green-800">all of London</em>
          </h1>
          <p className="text-stone-500 text-sm mb-8">Listings from every major portal, in one place.</p>
          <form onSubmit={handleSearch}>
            <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-2">
              <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder-stone-400"
                placeholder="Area, postcode or station — e.g. Hackney, E8"
              />
              <div className="w-px h-5 bg-stone-300"/>
              <button type="button" onClick={() => setType('rent')} className={'text-sm px-3 py-1 rounded-full ' + (type === 'rent' ? 'bg-green-800 text-white' : 'text-stone-500')}>
                Rent
              </button>
              <button type="button" onClick={() => setType('buy')} className={'text-sm px-3 py-1 rounded-full ' + (type === 'buy' ? 'bg-green-800 text-white' : 'text-stone-500')}>
                Buy
              </button>
              <div className="w-px h-5 bg-stone-300"/>
              <button type="submit" className="bg-green-800 text-white text-sm px-5 py-2 rounded-xl hover:bg-green-900 transition-colors">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs text-stone-400 text-center">Aggregating listings from Rightmove, Zoopla and OnTheMarket</p>
      </div>
    </main>
  )
}
