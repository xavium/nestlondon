'use client'

import { useState, useEffect } from 'react'

export default function ImageGallery({ images, address, floorplans = [], listedAt, shareButton }: { images: string[], address: string, floorplans?: string[], listedAt?: string | null, shareButton?: React.ReactNode }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [showFloorplan, setShowFloorplan] = useState(false)

  function open(i: number) { setLightbox(i) }
  function close() { setLightbox(null); setShowFloorplan(false) }
  function prev() { setLightbox(i => i !== null ? (i - 1 + images.length) % images.length : null) }
  function next() { setLightbox(i => i !== null ? (i + 1) % images.length : null) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft' && !showFloorplan) prev()
      if (e.key === 'ArrowRight' && !showFloorplan) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, showFloorplan])

  return (
    <>
      <div className="grid gap-2" style={{gridTemplateColumns: '2fr 1fr'}}>
        <div className="rounded-xl overflow-hidden bg-stone-200 cursor-pointer" style={{height: '480px'}} onClick={() => images[0] && open(0)}>
          {images[0] ? (
            <img src={images[0]} alt={address} className="w-full h-full object-cover hover:opacity-95 transition-opacity" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-stone-200" />
          )}
        </div>
        <div className="grid grid-rows-2 gap-2" style={{height: '480px'}}>
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl overflow-hidden bg-stone-200 cursor-pointer" onClick={() => images[i] && open(i)}>
              {images[i] ? (
                <img src={images[i]} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-stone-100" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {listedAt && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5"/></svg>
            {'Listed: ' + new Date(listedAt!).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}
          </div>
        )}
        <button className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-300 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/><path d="M3 9h18M9 21V9" strokeWidth="1.5"/></svg>
          {images.length} photos
        </button>
        {floorplans.length > 0 && (
          <button
            onClick={() => { setShowFloorplan(true); setLightbox(0) }}
            className="flex items-center gap-1.5 text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-1.5 hover:border-stone-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" strokeWidth="1.5"/></svg>
            Floorplan
            <img src={floorplans[0]} alt="floorplan preview" className="h-6 w-8 object-contain rounded" referrerPolicy="no-referrer" />
          </button>
        )}
        {shareButton}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={close}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full w-9 h-9 flex items-center justify-center text-sm z-10" onClick={close}>✕</button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {showFloorplan ? 'Floorplan' : (lightbox + 1) + ' / ' + images.length}
          </div>
          {!showFloorplan && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-11 h-11 flex items-center justify-center transition-colors z-10" onClick={e => { e.stopPropagation(); prev() }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 4l-8 6 8 6"/></svg>
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-11 h-11 flex items-center justify-center transition-colors z-10" onClick={e => { e.stopPropagation(); next() }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 4l8 6-8 6"/></svg>
              </button>
            </>
          )}
          <img
            src={showFloorplan ? floorplans[0] : images[lightbox]}
            alt={showFloorplan ? 'Floorplan' : ''}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />
          {!showFloorplan && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightbox(i) }} className={'w-1.5 h-1.5 rounded-full transition-colors ' + (i === lightbox ? 'bg-white' : 'bg-white/40')} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
