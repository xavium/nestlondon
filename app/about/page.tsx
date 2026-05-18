import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'

export const metadata = {
  title: 'About NestLondon',
  description: 'Why we built NestLondon: a search-first home for London property, with listings from every major portal in one place.',
}

export default function AboutPage() {
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
              The London property search,<br />
              <span className="italic" style={{ color: '#D3755A' }}>reimagined.</span>
            </h1>
            <p className="text-lg text-[#4A5568] leading-relaxed mb-6">
              NestLondon brings together rental and sale listings from every major UK portal into a single, smarter search. No tabs, no duplicates, no chasing.
            </p>
            <p className="text-base text-[#4A5568] leading-relaxed">
              We built this because Londoners spend hours moving between Rightmove, Zoopla, OnTheMarket and direct-agent sites — comparing the same handful of homes, missing the new ones, wondering if the price dropped last week.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden h-80 md:h-96 bg-gradient-to-br from-[#D3755A] to-[#1B2E4B] flex items-center justify-center">
            {/* Placeholder hero gradient — swap for a real London image when ready */}
            <div className="text-white/40 text-sm">London hero image</div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-6 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            Our mission
          </h2>
          <div className="space-y-4 text-[#4A5568] leading-relaxed">
            <p>
              We think searching for a home should feel less like project management and more like discovery. So we&apos;ve built tools that respect your time: multi-location commute filtering, transparent price history, lease detail at a glance, and a borough quiz that gets to a shortlist in under a minute.
            </p>
            <p>
              NestLondon is independent. We&apos;re not owned by an estate agency, and we don&apos;t take commission on transactions. The platform stays focused on serving renters, buyers, and the agents who list with us.
            </p>
            <p>
              We&apos;re a small team based in London, building this carefully.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-light mb-8 text-[#1C2B3A]" style={{ fontFamily: 'Georgia, serif' }}>
            Meet the team
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8E2DA] p-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8E2DA] to-[#D3755A] mb-4" />
                <h3 className="font-semibold text-[#1C2B3A] mb-1">Team Member</h3>
                <p className="text-xs text-stone-500 mb-3">Role</p>
                <p className="text-sm text-[#4A5568] leading-relaxed">
                  Short bio placeholder. Replace with real team details when ready.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16" style={{ background: '#1C2B3A' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4 text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Get in touch
          </h2>
          <p className="text-white/70 mb-6 max-w-2xl mx-auto">
            Press, partnerships, feedback, bugs, or just a hello — we read everything.
          </p>
          <a
            href="mailto:hello@nestlondon.co.uk"
            className="inline-block px-6 py-3 rounded-lg font-medium text-white"
            style={{ background: '#D3755A' }}
          >
            hello@nestlondon.co.uk
          </a>
        </div>
      </section>
    </main>
  )
}
