'use client'

import { useState } from 'react'
import EPCChart from './EPCChart'
import TileIconClient from './TileIconClient'

interface Props {
  details: Record<string, string>
  epcRating?: string | null
  epcScore?: number | null
  epcPotentialRating?: string | null
  epcPotentialScore?: number | null
}

export default function PropertyDetailsTiles({ details, epcRating, epcScore, epcPotentialRating, epcPotentialScore }: Props) {
  const [showEpc, setShowEpc] = useState(false)

  const entries = Object.entries(details)
  if (entries.length === 0) return null

  return (
    <>
      <div className="bg-white border border-[#E8E2DA] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#1C2B3A] mb-3">Property details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entries.map(([k, v]) => {
            const isEpc = k === 'EPC Rating' && epcRating
            const baseClass = "bg-[#F5F0EB] rounded-xl p-3 text-center flex flex-col items-center justify-center"
            const interactiveClass = baseClass + " cursor-pointer hover:bg-[#F0E5D5] transition-colors"
            if (isEpc) {
              return (
                <button key={k} onClick={() => setShowEpc(true)} className={interactiveClass + " border-0"}>
                  <TileIconClient name={k} />
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{k}</div>
                  <div className="text-sm font-semibold text-[#1C2B3A]">{v}</div>
                </button>
              )
            }
            return (
              <div key={k} className={baseClass}>
                <TileIconClient name={k} />
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{k}</div>
                <div className="text-sm font-semibold text-[#1C2B3A]">{v}</div>
              </div>
            )
          })}
        </div>
      </div>

      {showEpc && epcRating && (
        <EPCChart
          epcRating={epcRating}
          epcScore={epcScore}
          epcPotentialRating={epcPotentialRating}
          epcPotentialScore={epcPotentialScore}
          onClose={() => setShowEpc(false)}
        />
      )}
    </>
  )
}
