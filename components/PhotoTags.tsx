'use client'

import { useState, useEffect } from 'react'

interface Tags {
  style: string | null
  condition: string | null
  features: string[]
}

const CONDITION_COLOURS: Record<string, string> = {
  'Excellent': 'bg-green-50 text-green-700 border-green-200',
  'Good': 'bg-blue-50 text-blue-700 border-blue-200',
  'Fair': 'bg-amber-50 text-amber-700 border-amber-200',
  'Needs work': 'bg-red-50 text-red-600 border-red-200',
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

  if (!tags || (!tags.style && !tags.condition && !tags.features?.length)) return null

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {tags.style && (
        <span className="text-xs px-3 py-1 rounded-full border bg-[#F5EBE0] text-[#1B2E4B] border-[#E8E2DA] font-medium">
          {tags.style}
        </span>
      )}
      {tags.condition && (
        <span className={'text-xs px-3 py-1 rounded-full border font-medium ' + (CONDITION_COLOURS[tags.condition] || 'bg-[#F5EBE0] text-[#1B2E4B] border-[#E8E2DA]')}>
          {tags.condition} condition
        </span>
      )}
      {(tags.features || []).map(f => (
        <span key={f} className="text-xs px-3 py-1 rounded-full border bg-white text-[#3D3A38] border-[#E8E2DA]">
          {f}
        </span>
      ))}
    </div>
  )
}
