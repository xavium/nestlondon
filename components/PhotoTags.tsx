'use client'

import { useState, useEffect } from 'react'

interface Tags {
  style: string | null
  features: string[]
}

export default function PhotoTags({ listingId, initialTags }: { listingId: string, initialTags?: Tags | null }) {
  const [tags, setTags] = useState<Tags | null>(initialTags || null)
  const [loading, setLoading] = useState(!initialTags)

  useEffect(() => {
    if (initialTags) return
    fetch('/api/listing-tags?listing_id=' + listingId)
      .then(r => r.json())
      .then(d => { if (d.tags) setTags(d.tags) })
      .finally(() => setLoading(false))
  }, [listingId])

  if (loading) return (
    <div className="flex gap-2 flex-wrap">
      {[1,2,3].map(i => <div key={i} className="h-6 w-20 bg-[#F0EBE5] rounded-full animate-pulse" />)}
    </div>
  )

  if (!tags || (!tags.style && !tags.features?.length)) return null

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {tags.style && (
        <span className="text-xs px-3 py-1 rounded-full border bg-[#F5EBE0] text-[#1B2E4B] border-[#E8E2DA] font-medium">
          {tags.style}
        </span>
      )}
      {(tags.features || []).map(f => (
        <span key={f} className="text-xs px-3 py-1 rounded-full border bg-white text-[#3D3A38] border-[#E8E2DA]">
          {f.replace(/ visible$/i, '').replace(/ detected$/i, '')}
        </span>
      ))}
    </div>
  )
}
