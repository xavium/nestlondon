'use client'

import { useEffect } from 'react'
import { markAsViewed } from '@/lib/viewed'

export default function MarkViewed({ id }: { id: string }) {
  useEffect(() => {
    markAsViewed(id)
  }, [id])
  return null
}
