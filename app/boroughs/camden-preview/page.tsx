import { getBoroughBySlug } from '@/data/boroughGuides'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default function CamdenPreviewPage() {
  const borough = getBoroughBySlug('camden')
  if (!borough) notFound()

  const firstGem = borough.hiddenGems[0]
  const otherGems = borough.hiddenGems.slice(1)

  return (
    <div className="min-h-screen bg-[#F5EBE0] text-[#1C2B3A]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5EBE0]/80 backdrop-blur-xl">
        <nav className="flex justify-between items-center w-full px-8 py-4 max-w-6xl mx-auto">
          <Link href="/" className="text-2xl font-light no-underline" style={{fontFamily: 'Georgia, serif'}}>
            nest<span className="italic" style={{color: '#D3755A'}}>london</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/boroughs" className="text-[#D3755A] font-bold border-b-2 border-[#D3755A] pb-1 text-sm tracking-wide no-underline">Boroughs</Link>
            <Link href="/search" className="text-[#1B2E4B] font-medium hover:text-[#D3755A] transition-colors duration-300 text-sm tracking-wide no-underline">Search</Link>
            <Link href="/list" className="text-[#1B2E4B] font-medium hover:text-[#D3755A] transition-colors duration-300 text-sm tracking-wide no-underline">List your property</Link>
          </div>
          <Link href="/search" className="bg-[#D3755A] text-white px-6 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95 duration-200 no-underline">
            Find a home
          </Link>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero */}
        <section className="relative h-[480px] w-full px-8 flex items-center overflow-hidden">
          {borough.heroImage && (
            <div className="absolute inset-0 z-0">
              <img src={borough.heroImage} alt={borough.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F5EBE0] via-[#F5EBE0]/40 to-transparent" />
            </div>
          )}
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-4 py-1 rounded-full bg-[#D3755A]/15 text-[#D3755A] text-xs font-bold tracking-widest uppercase mb-6">Borough Spotlight</span>
            <h1 className="text-5xl font-light leading-tight mb-5" style={{fontFamily: 'Georgia, serif'}}>
              {borough.name}:<br/>
              <span className="italic text-[#D3755A]">{borough.tagline.split('—')[0].trim()}</span>
            </h1>
            <p className="text-base text-[#55433e] leading-relaxed mb-6 max-w-lg">{borough.description}</p>
            <div className="flex flex-wrap gap-2">
              {borough.postcodes.map(pc => (
                <span key={pc} className="text-xs bg-white/60 text-[#1B2E4B] px-3 py-1.5 rounded-full font-medium">{pc}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Landmarks — unified stagger */}
        <section className="max-w-6xl mx-auto px-8 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-light mb-3" style={{fontFamily: 'Georgia, serif'}}>Landmarks & must-see places</h2>
            <div className="h-[2px] w-24 bg-[#D3755A] mx-auto" />
          </div>
          <div className="flex flex-col gap-4">
            {borough.landmarks.map(item => (
              item.image ? (
                <div key={item.name} className="flex gap-4 rounded-xl overflow-hidden bg-white border border-[#E8E2DA]">
                  <div className="w-1/3 aspect-[4/3] flex-shrink-0 overflow-hidden" style={{maskImage: 'linear-gradient(to right, black 75%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 75%, transparent 100%)'}}>
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center">
                    <div className="text-base font-semibold text-[#1C2B3A] mb-1" style={{fontFamily: 'Georgia, serif'}}>{item.name}</div>
                    <div className="text-sm text-[#55433e] leading-relaxed">{item.description}</div>
                  </div>
                </div>
              ) : (
                <div key={item.name} className="flex gap-4 pb-4 border-b border-[#E8E2DA] last:border-0 last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D3755A] mt-2 flex-shrink-0" />
                  <div>
                    <div className="text-base font-semibold text-[#1C2B3A] mb-1" style={{fontFamily: 'Georgia, serif'}}>{item.name}</div>
                    <div className="text-sm text-[#55433e] leading-relaxed">{item.description}</div>
                  </div>
                </div>
              )
            ))}
          </div>
        </section>

        {/* Hidden Gems — dark asymmetric */}
        <section className="bg-[#1B2E4B] text-white py-20 px-8 overflow-hidden">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-5">
              <span className="text-[#D3755A] text-xs font-bold tracking-widest uppercase block mb-6">Off the beaten path</span>
              <h2 className="text-4xl font-light mb-6" style={{fontFamily: 'Georgia, serif'}}>Hidden Gems</h2>
              <p className="text-white/70 text-base leading-relaxed mb-8">The quiet corners residents keep close.</p>
              <div className="space-y-8">
                {borough.hiddenGems.map((item, i) => (
                  <div key={item.name} className="flex gap-6 items-start group">
                    <div className="w-12 h-12 rounded-full border border-[#D3755A] flex items-center justify-center shrink-0 group-hover:bg-[#D3755A] transition-colors">
                      <span style={{fontFamily: 'Georgia, serif'}}>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-light mb-2" style={{fontFamily: 'Georgia, serif'}}>{item.name}</h4>
                      <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-7 relative flex justify-end">
              {firstGem?.image && (
                <div className="w-4/5 aspect-[4/3] rounded-xl overflow-hidden rotate-2 shadow-2xl">
                  <img src={firstGem.image} alt={firstGem.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                </div>
              )}
              {otherGems[0]?.image && (
                <div className="absolute -bottom-8 left-0 w-3/5 aspect-square rounded-xl overflow-hidden -rotate-3 border-8 border-[#1B2E4B] shadow-2xl">
                  <img src={otherGems[0].image} alt={otherGems[0].name} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Closing quote */}
        <section className="py-20 px-8 text-center max-w-3xl mx-auto">
          <div className="text-4xl text-[#D3755A] mb-6 font-serif leading-none">"</div>
          <blockquote className="text-2xl font-light leading-tight mb-8" style={{fontFamily: 'Georgia, serif'}}>
            {borough.tagline}
          </blockquote>
          <p className="text-xs uppercase tracking-widest font-bold text-[#1B2E4B]/60">NestLondon Editorial</p>
        </section>
      </main>
    </div>
  )
}
