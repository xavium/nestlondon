'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const LABELS = [
  'Just Listed', 'Popular', 'Great Value', 'Must See', 'Hot Right Now', 'New to Market'
]

function getLabel(id: string) {
  const n = parseInt(id.replace(/-/g, '').slice(0, 8), 16) % LABELS.length
  return LABELS[n]
}

export default function FeaturedListings() {
  const [featured, setFeatured] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const resp = await fetch(
        'https://mxqrnholgkmpzuuvfden.supabase.co/rest/v1/listings?select=id,address,price,images,bedrooms,bathrooms,property_type,listed_at&is_active=eq.true&images=not.is.null&order=listed_at.desc&limit=50',
        { headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        }}
      )
      const data = await resp.json()
      const withImgs = (data || [])
        .map((l: any) => {
          try {
            const imgs = typeof l.images === 'string' ? JSON.parse(l.images) : (l.images || [])
            const img = imgs.find((u: string) => u?.startsWith('https')) || null
            return { ...l, img }
          } catch { return { ...l, img: null } }
        })
        .filter((l: any) => l.img)
        .slice(0, 6)
      setFeatured(withImgs)
    }
    load()
  }, [])

  if (featured.length === 0) return (
    <section className="bg-[#F1EFE8] py-16 px-6 min-h-[300px]" />
  )

  const [hero, ...rest] = featured

  return (
    <section className="bg-[#F1EFE8] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{color: '#D85A30'}}>The Selection</p>
            <h2 className="text-4xl font-light text-stone-800" style={{fontFamily: 'Georgia, serif'}}>Latest Listings</h2>
          </div>
          <Link href="/search?type=rent" className="text-sm text-stone-500 hover:text-stone-800 transition-colors border-b border-stone-300 hover:border-stone-600 pb-0.5">
            View all listings →
          </Link>
        </div>

        {/* Hero + side cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Link href={'/listings/' + hero.id} className="group relative rounded-2xl overflow-hidden block" style={{height: '480px'}}>
            <img src={hero.img} alt={hero.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white mb-3">
                {getLabel(hero.id)}
              </span>
              <div className="text-white text-xl font-light mb-1" style={{fontFamily: 'Georgia, serif'}}>{hero.address}</div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-white text-2xl font-semibold">£{hero.price?.toLocaleString()}<span className="text-sm font-light text-white/70">/mo</span></div>
                <div className="flex gap-4 text-white/70 text-sm">
                  {hero.bedrooms && <span>{hero.bedrooms} bed</span>}
                  {hero.bathrooms && <span>{hero.bathrooms} bath</span>}
                  {hero.property_type && <span>{hero.property_type}</span>}
                </div>
              </div>
            </div>
          </Link>

          <div className="flex flex-col gap-6">
            {rest.slice(0, 2).map((l: any) => (
              <Link key={l.id} href={'/listings/' + l.id} className="group relative rounded-2xl overflow-hidden block flex-1" style={{minHeight: '220px'}}>
                <img src={l.img} alt={l.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white mb-2">
                    {getLabel(l.id)}
                  </span>
                  <div className="text-white font-light mb-1" style={{fontFamily: 'Georgia, serif'}}>{l.address}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">£{l.price?.toLocaleString()}<span className="text-xs font-light text-white/70">/mo</span></div>
                    <div className="flex gap-3 text-white/70 text-xs">
                      {l.bedrooms && <span>{l.bedrooms} bed</span>}
                      {l.property_type && <span>{l.property_type}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {rest.slice(2, 5).map((l: any) => (
            <Link key={l.id} href={'/listings/' + l.id} className="group relative rounded-2xl overflow-hidden block" style={{height: '240px'}}>
              <img src={l.img} alt={l.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-white text-sm font-light truncate mb-1" style={{fontFamily: 'Georgia, serif'}}>{l.address}</div>
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm font-semibold">£{l.price?.toLocaleString()}<span className="text-xs font-light text-white/70">/mo</span></div>
                  {l.bedrooms && <span className="text-white/70 text-xs">{l.bedrooms} bed</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-stone-400 text-sm mb-4">Aggregating listings from every major London portal</p>
          <Link href="/search?type=rent"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{background: '#D85A30'}}
          >
            Browse all listings
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
