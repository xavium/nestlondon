'use client'

const TILE_ICONS: Record<string, string> = {
  'Available':    '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round"/>',
  'Bedrooms':     '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
  'Bathrooms':    '<rect x="8" y="2" width="8" height="4" rx="1" strokeWidth="1.5"/><path d="M7 6h10v1H7z" strokeWidth="1"/><path d="M7 7c0 6 2.5 9 5 9s5-3 5-9" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 16h6" strokeWidth="1.5" strokeLinecap="round"/><rect x="9" y="17" width="6" height="3" rx="0.5" strokeWidth="1.5"/>',
  'Size':         '<path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
  '£/sqm':        '<rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>',
  'Parking':      '<path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
  'Outside Space':'<path d="M12 22V12m0 0C12 7 7 4 7 4s1 5 5 8m0-8c0-5 5-8 5-8s-1 5-5 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
  'EPC Rating':   '<path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>',
  'Council Tax':  '<path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" strokeWidth="1.5" strokeLinecap="round"/>',
}

export default function TileIconClient({ name }: { name: string }) {
  const path = TILE_ICONS[name]
  if (!path) return null
  return (
    <svg className="w-4 h-4 text-[#D85A30] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{__html: path}} />
  )
}
