import { boroughGuides } from '@/data/boroughGuides'
import Link from 'next/link'

export default function BoroughsPage() {
  return (
    <div className="min-h-screen bg-[#F5EBE0]">
      <nav className="border-b border-[#1C2B3A]/10 bg-white relative z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#1C2B3A]" style={{fontFamily: 'Georgia, serif'}}>NestLondon</Link>
          <Link href="/search?type=rent" className="text-sm text-stone-500 hover:text-[#D3755A] transition-colors">Search listings</Link>
        </div>
      </nav>
      <div className="bg-[#1B2E4B] text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{fontFamily: 'Georgia, serif'}}>London Borough Guides</h1>
        <p className="text-xl text-white/70 max-w-2xl mx-auto">Everything you need to know before you move — from hidden gems to local insights.</p>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boroughGuides.map(borough => (
            <Link key={borough.slug} href={`/boroughs/${borough.slug}`}
              className="bg-white rounded-2xl p-6 border border-[#E8E2DA] hover:border-[#D3755A] hover:shadow-md transition-all group">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {borough.postcodes.slice(0, 3).map(pc => (
                  <span key={pc} className="text-xs bg-[#F5EBE0] text-stone-500 px-2 py-0.5 rounded-full">{pc}</span>
                ))}
                {borough.postcodes.length > 3 && <span className="text-xs text-stone-400">+{borough.postcodes.length - 3}</span>}
              </div>
              <h2 className="text-lg font-semibold text-[#1C2B3A] mb-1 group-hover:text-[#D3755A] transition-colors" style={{fontFamily: 'Georgia, serif'}}>{borough.name}</h2>
              <p className="text-xs text-stone-500 leading-relaxed">{borough.tagline}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {borough.bestFor.slice(0, 2).map(item => (
                  <span key={item} className="text-xs bg-[#F5EBE0] text-[#D3755A] px-2 py-0.5 rounded-full">{item}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
