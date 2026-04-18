'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { BoroughGuide } from '@/data/boroughGuides'

export default function BoroughGuideInline({ borough }: { borough: BoroughGuide }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Area guide</div>
            <h2 className="text-xl font-semibold text-[#1C2B3A]" style={{fontFamily: 'Georgia, serif'}}>{borough.name}</h2>
          </div>
          <Link href={`/boroughs/${borough.slug}`} className="flex-shrink-0 text-xs text-[#D3755A] hover:underline">Full guide →</Link>
        </div>
        <p className="text-sm text-stone-500 italic mb-3">"{borough.tagline}"</p>
        <p className="text-sm text-[#3D3A38] leading-relaxed">{borough.description}</p>
      </div>
      <div className="px-6 pb-4">
        <div className="bg-[#F5EBE0] rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Transport</div>
          <p className="text-xs text-[#3D3A38] leading-relaxed">{borough.transport}</p>
        </div>
      </div>
      <div className="px-6 pb-4">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Best for</div>
        <div className="flex flex-wrap gap-2">
          {borough.bestFor.map(item => (
            <span key={item} className="text-xs bg-[#F5EBE0] text-[#D3755A] px-2.5 py-1 rounded-full">{item}</span>
          ))}
        </div>
      </div>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3 border-t border-[#E8E2DA] text-xs text-stone-500 hover:text-[#D3755A] hover:bg-[#F5EBE0] transition-colors flex items-center justify-between">
        <span>{expanded ? 'Show less' : 'Show landmarks, hidden gems & local insights'}</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {expanded && (
        <div className="border-t border-[#E8E2DA]">
          <div className="p-6 border-b border-[#E8E2DA]">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Must-see places</h3>
            <div className="flex flex-col gap-3">
              {borough.landmarks.map(item => (
                <div key={item.name} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D3755A] mt-1.5 flex-shrink-0" />
                  <div><div className="text-sm font-semibold text-[#1C2B3A]">{item.name}</div><div className="text-xs text-stone-500 leading-relaxed">{item.description}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 bg-[#1B2E4B] border-b border-[#E8E2DA]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-4">Hidden gems</h3>
            <div className="flex flex-col gap-3">
              {borough.hiddenGems.map(item => (
                <div key={item.name} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D3755A] mt-1.5 flex-shrink-0" />
                  <div><div className="text-sm font-semibold text-white">{item.name}</div><div className="text-xs text-white/60 leading-relaxed">{item.description}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Local insights</h3>
            <ul className="flex flex-col gap-3">
              {borough.localInsights.map((insight, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#3D3A38] leading-relaxed">
                  <span className="text-[#D3755A] font-semibold flex-shrink-0 text-xs mt-0.5">{i + 1}.</span>{insight}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 pb-6">
            <Link href={`/boroughs/${borough.slug}`} className="block w-full text-center text-sm py-2.5 rounded-xl border border-[#D3755A] text-[#D3755A] hover:bg-[#D3755A] hover:text-white transition-colors">
              Read the full {borough.name} guide →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
