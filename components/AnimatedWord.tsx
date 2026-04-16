'use client'

import { useEffect, useState } from 'react'

const WORD = 'home'
const TYPE_MS = 200

export default function AnimatedWord() {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    if (displayed.length === WORD.length) { setDone(true); return }
    const t = setTimeout(() => {
      setDisplayed(WORD.slice(0, displayed.length + 1))
    }, TYPE_MS)
    return () => clearTimeout(t)
  }, [displayed, done])

  return (
    <span style={{ display: 'inline-block', position: 'relative', fontStyle: 'italic', whiteSpace: 'nowrap', background: '#D3755A', borderRadius: '0.3em', padding: '0.05em 0.3em', color: 'white' }}>
      {/* Full word invisible to reserve space */}
      <span style={{ visibility: 'hidden' }}>{WORD}</span>
      {/* Typed text absolutely positioned */}
      <span style={{ position: 'absolute', left: '0.3em', top: '0.05em' }}>
        {displayed}
        {!done && <span style={{ display: 'inline-block', width: '2px', height: '0.85em', background: 'white', marginLeft: '1px', verticalAlign: 'middle' }} />}
      </span>
    </span>
  )
}
