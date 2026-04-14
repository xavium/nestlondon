'use client'

import { useEffect, useState } from 'react'

const WORDS = ['flat', 'house', 'haven', 'pad', 'crib', 'retreat', 'nest', 'home']
const HOLD_MS = 380
const TRANSITION_MS = 220

export default function AnimatedWord() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) return
    let t: ReturnType<typeof setTimeout>

    if (phase === 'in') {
      t = setTimeout(() => setPhase('hold'), TRANSITION_MS)
    } else if (phase === 'hold') {
      const isLast = index === WORDS.length - 1
      if (isLast) { setDone(true); return }
      t = setTimeout(() => setPhase('out'), HOLD_MS)
    } else if (phase === 'out') {
      t = setTimeout(() => {
        setIndex(i => i + 1)
        setPhase('in')
      }, TRANSITION_MS)
    }
    return () => clearTimeout(t)
  }, [phase, index, done])

  const word = WORDS[index]
  const isHome = word === 'home'

  const translateY = phase === 'in' ? '0.35em' : phase === 'out' ? '-0.35em' : '0'
  const opacity = phase === 'hold' ? 1 : 0
  const blur = phase === 'hold' ? '0px' : '6px'

  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: '3ch',
        transition: `transform ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease, filter ${TRANSITION_MS}ms ease, padding ${TRANSITION_MS}ms ease, background ${TRANSITION_MS}ms ease, border-radius ${TRANSITION_MS}ms ease`,
        transform: `translateY(${translateY})`,
        opacity,
        filter: `blur(${blur})`,
        color: isHome ? 'white' : 'white',
        fontStyle: isHome ? 'italic' : 'normal',
        whiteSpace: 'nowrap',
        background: isHome ? '#D3755A' : 'transparent',
        borderRadius: isHome ? '0.3em' : '0.3em',
        padding: isHome ? '0.05em 0.3em' : '0.05em 0',
      }}
    >
      {word}
    </span>
  )
}
