import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'

export const metadata = {
  title: 'For Sellers — List with NestLondon',
  description: 'List your London property on NestLondon. Direct to buyers and renters, no middleman fees, modern listing tools.',
}

export default function ForSellersPage() {
  return (
    <main className="min-h-screen" style={{ background: '#F8F4ED' }}>
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-xl font-light" style={{ fontFamily: 'Georgia, serif', color: '#1C2B3A' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton />
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-light mb-6 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
              List your London home,<br />
              <span className="italic" style={{ color: '#D3755A' }}>direct.</span>
            </h1>
            <p className="text-lg text-[#4A5568] leading-relaxed mb-8">
              Reach renters and buyers searching London — without paying agency commission. Modern listing tools, real-time enquiries, full control of your viewings.
            </p>
            <Link
              href="/list/auth"
              className="inline-block px-7 py-3.5 rounded-lg font-medium text-white"
              style={{ background: '#D3755A' }}
            >
              List a property
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden h-80 md:h-96 bg-gradient-to-br from-[#1B2E4B] to-[#D3755A] flex items-center justify-center">
            <div className="text-white/40 text-sm">Hero image</div>
          </div>
        </div>
      </section>

      {/* Why list */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-10 text-center text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            Why list with NestLondon
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'No commission',
                body: 'You keep what you sell or rent for. We charge flat listing fees, not a percentage of your sale price.',
              },
              {
                title: 'Real reach',
                body: 'Your listing appears alongside Rightmove and Zoopla imports — buyers and renters see you in the same search.',
              },
              {
                title: 'Modern tools',
                body: 'Manage enquiries, schedule viewings, see analytics — all from one dashboard. No more email chains.',
              },
            ].map((card, i) => (
              <div key={i} className="bg-[#F8F4ED] rounded-2xl p-6 border border-[#E8E2DA]">
                <div className="w-10 h-10 rounded-full mb-4 flex items-center justify-center" style={{ background: '#D3755A20' }}>
                  <span className="font-semibold" style={{ color: '#D3755A' }}>{i + 1}</span>
                </div>
                <h3 className="font-semibold text-[#1C2B3A] mb-2">{card.title}</h3>
                <p className="text-sm text-[#4A5568] leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-10 text-center text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            How it works
          </h2>
          <div className="space-y-6">
            {[
              { step: '01', title: 'Create your account', body: 'Sign up in a couple of minutes. Verify your identity to publish.' },
              { step: '02', title: 'Add your property', body: 'Photos, key details, lease info if it applies. We&apos;ll suggest pricing based on comparables.' },
              { step: '03', title: 'Get enquiries', body: 'Renters and buyers reach you directly. Reply, schedule viewings, and close — all in NestLondon.' },
            ].map((row, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="text-4xl font-light text-[#D3755A] min-w-[60px]" style={{ fontFamily: 'Georgia, serif' }}>
                  {row.step}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1C2B3A] mb-1">{row.title}</h3>
                  <p className="text-sm text-[#4A5568] leading-relaxed" dangerouslySetInnerHTML={{ __html: row.body.replace(/&apos;/g, '&rsquo;') }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            Pricing
          </h2>
          <p className="text-[#4A5568] mb-8 leading-relaxed">
            Listings are currently free during our launch. We&apos;ll introduce paid premium placement options later in 2026; baseline listings will always stay free for private sellers.
          </p>
          <Link
            href="/list/auth"
            className="inline-block px-7 py-3.5 rounded-lg font-medium text-white"
            style={{ background: '#D3755A' }}
          >
            Start listing
          </Link>
        </div>
      </section>
    </main>
  )
}
