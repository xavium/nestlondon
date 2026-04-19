import { getBoroughBySlug, boroughGuides } from '@/data/boroughGuides'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateStaticParams() {
  return boroughGuides.map(b => ({ slug: b.slug }))
}

export default async function BoroughPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const borough = getBoroughBySlug(slug)
  if (!borough) notFound()

  return (
    <div className="min-h-screen bg-[#F5EBE0]">
      <nav className="border-b border-[#1C2B3A]/10 bg-white relative z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#1C2B3A]" style={{fontFamily: 'Georgia, serif'}}>NestLondon</Link>
          <Link href="/boroughs" className="text-sm text-stone-500 hover:text-[#D3755A] transition-colors">← All boroughs</Link>
        </div>
      </nav>
      <div className="relative text-white py-16 px-4" style={{background: "#1B2E4B"}}>
        {borough.heroImage && <img src={borough.heroImage} alt={borough.name} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            {borough.postcodes.map(pc => (
              <span key={pc} className="text-xs bg-white/10 text-white/70 px-2.5 py-1 rounded-full">{pc}</span>
            ))}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{fontFamily: 'Georgia, serif'}}>{borough.name}</h1>
          <p className="text-xl text-white/70 max-w-2xl">{borough.tagline}</p>
        </div></div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-8">
        <div className="bg-white rounded-2xl p-8 border border-[#E8E2DA]">
          <p className="text-[#3D3A38] text-lg leading-relaxed">{borough.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#E8E2DA]">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Best for</h2>
            <ul className="flex flex-col gap-2">
              {borough.bestFor.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3D3A38]">
                  <span className="text-[#D3755A] mt-0.5 flex-shrink-0">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E8E2DA]">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Consider if</h2>
            <ul className="flex flex-col gap-2">
              {borough.avoidIf.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[#3D3A38]">
                  <span className="text-stone-400 mt-0.5 flex-shrink-0">→</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#E8E2DA]">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Transport</h2>
          <p className="text-sm text-[#3D3A38] leading-relaxed">{borough.transport}</p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#E8E2DA]">
          <h2 className="text-lg font-semibold text-[#1C2B3A] mb-4" style={{fontFamily: 'Georgia, serif'}}>Historical context</h2>
          <p className="text-sm text-[#3D3A38] leading-relaxed">{borough.history}</p>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#E8E2DA]">
          <h2 className="text-lg font-semibold text-[#1C2B3A] mb-5" style={{fontFamily: 'Georgia, serif'}}>Must-see landmarks & places</h2>
          <div className="flex flex-col gap-4">
            {borough.landmarks.map(item => (
              <div key={item.name} className="flex gap-4 pb-4 border-b border-[#F5EBE0] last:border-0 last:pb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D3755A] mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-[#1C2B3A] mb-0.5">{item.name}</div>
                  <div className="text-sm text-stone-500 leading-relaxed">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1B2E4B] rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-5" style={{fontFamily: 'Georgia, serif'}}>Hidden gems</h2>
          <div className="flex flex-col gap-4">
            {borough.hiddenGems.map(item => (
              <div key={item.name} className="flex gap-4 pb-4 border-b border-white/10 last:border-0 last:pb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D3755A] mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">{item.name}</div>
                  <div className="text-sm text-white/60 leading-relaxed">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-[#E8E2DA]">
          <h2 className="text-lg font-semibold text-[#1C2B3A] mb-5" style={{fontFamily: 'Georgia, serif'}}>Local insights — before you move</h2>
          <ul className="flex flex-col gap-3">
            {borough.localInsights.map((insight, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#3D3A38] leading-relaxed">
                <span className="text-[#D3755A] font-semibold flex-shrink-0">{i + 1}.</span>{insight}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#D3755A] rounded-2xl p-8 text-white text-center">
          <h2 className="text-xl font-semibold mb-2" style={{fontFamily: 'Georgia, serif'}}>Find your home in {borough.name}</h2>
          <p className="text-white/80 text-sm mb-6">Browse current listings across {borough.postcodes.join(', ')}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href={`/search?type=rent&location=${encodeURIComponent(borough.name)}`}
              className="bg-white text-[#D3755A] px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Rent in {borough.name}
            </Link>
            <Link href={`/search?type=buy&location=${encodeURIComponent(borough.name)}`}
              className="bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors border border-white/30">
              Buy in {borough.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
