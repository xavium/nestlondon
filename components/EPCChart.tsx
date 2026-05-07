'use client'

import { useEffect } from 'react'

interface Props {
  epcRating: string
  epcScore?: number | null
  epcPotentialRating?: string | null
  epcPotentialScore?: number | null
  onClose: () => void
}

export default function EPCChart({ epcRating, epcScore, epcPotentialRating, epcPotentialScore, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.4)'}} onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-light text-[#1B2E4B]" style={{fontFamily:'Georgia,serif'}}>Energy Performance Certificate</h3>
          <button onClick={onClose} className="text-[#9B928E] hover:text-[#1B2E4B] text-xl leading-none ml-4">×</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {['A','B','C','D','E','F','G'].map(band => {
            const widths = {A:95,B:82,C:69,D:56,E:43,F:30,G:17}
            const colors = {A:'#008054',B:'#19b459',C:'#8dce46',D:'#ffd500',E:'#fcaa00',F:'#ef8023',G:'#e9153b'}
            const w = widths[band as keyof typeof widths]
            const col = colors[band as keyof typeof colors]
            const isCurrent = band === epcRating
            const isPotential = band === epcPotentialRating
            return (
              <div key={band} className="flex items-center gap-2">
                <div className="w-4 text-xs font-bold text-stone-500">{band}</div>
                <div className="flex-1 relative h-7">
                  <div className="h-full rounded-sm flex items-center px-2" style={{width: w+'%', background: col}}>
                    <span className="text-white text-xs font-semibold">{band}</span>
                  </div>
                  {isCurrent && (
                    <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                      <span className="text-xs font-bold text-[#1C2B3A]">{epcScore}</span>
                      <span className="text-xs bg-[#1C2B3A] text-white px-1.5 py-0.5 rounded font-bold">Current</span>
                    </div>
                  )}
                  {isPotential && !isCurrent && (
                    <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                      <span className="text-xs font-bold text-[#1C2B3A]">{epcPotentialScore}</span>
                      <span className="text-xs bg-stone-400 text-white px-1.5 py-0.5 rounded font-bold">Potential</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {epcPotentialRating && epcPotentialRating !== epcRating && (
          <p className="text-xs text-stone-400 mt-3">Potential rating: Band {epcPotentialRating} ({epcPotentialScore})</p>
        )}
      </div>
    </div>
  )
}
