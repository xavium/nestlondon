'use client'

import { useState, useEffect } from 'react'

export default function ImageGallery({ images, address }: { images: string[], address: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  function open(i: number) { setLightbox(i) }
  function close() { setLightbox(null) }
  function prev() { setLightbox(i => i !== null ? (i - 1 + images.length) % images.length : null) }
  function next() { setLightbox(i => i !== null ? (i + 1) % images.length : null) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length])

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-xl overflow-hidden bg-stone-200 cursor-pointer"
          onClick={() => images[0] && open(0)}
        >
          {images[0] ? (
            <img src={images[0]} alt={address} className="w-full h-full object-cover hover:opacity-95 transition-opacity" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-64 bg-stone-200" />
          )}
        </div>
        <div className="grid grid-rows-2 gap-2">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-xl overflow-hidden bg-stone-200 cursor-pointer"
              onClick={() => images[i] && open(i)}
            >
              {images[i] ? (
                <img src={images[i]} alt="" className="w-full h-full object-cover hover:opacity-95 transition-opacity" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-stone-100" />
              )}
            </div>
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full w-9 h-9 flex items-center justify-center text-sm z-10"
            onClick={close}
          >
            ✕
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {lightbox + 1} / {images.length}
          </div>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-11 h-11 flex items-center justify-center transition-colors z-10"
            onClick={e => { e.stopPropagation(); prev() }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 4l-8 6 8 6"/></svg>
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-11 h-11 flex items-center justify-center transition-colors z-10"
            onClick={e => { e.stopPropagation(); next() }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 4l8 6-8 6"/></svg>
          </button>

          <img
            src={images[lightbox]}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setLightbox(i) }}
                className={'w-1.5 h-1.5 rounded-full transition-colors ' + (i === lightbox ? 'bg-white' : 'bg-white/40')}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
