import Link from 'next/link'

/**
 * Global footer mounted in app/layout.tsx. Appears on every page.
 *
 * Replaces the inline footer that used to live in app/page.tsx.
 * Links: Privacy/Terms remain as TODOs (those pages don't exist yet).
 * About/Blog/For Sellers are the new resource section additions.
 */
export default function Footer() {
  return (
    <footer style={{ background: '#1C2B3A' }} className="py-10 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="text-xl font-light text-white" style={{ fontFamily: 'Georgia, serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </div>
        <p className="text-white/30 text-xs">© 2026 NestLondon. All listings sourced from public portals.</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-white/40 text-xs">
          <Link href="/about" className="hover:text-white/70 transition-colors">About</Link>
          <Link href="/blog" className="hover:text-white/70 transition-colors">Blog</Link>
          <Link href="/for-sellers" className="hover:text-white/70 transition-colors">For sellers</Link>
          <Link href="/list/auth" className="hover:text-white/70 transition-colors">For agents</Link>
          <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
        </nav>
      </div>
    </footer>
  )
}
