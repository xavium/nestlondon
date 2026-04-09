'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  'Angel', 'Balham', 'Barbican', 'Barnsbury', 'Battersea', 'Bermondsey',
  'Bethnal Green', 'Bow', 'Brixton', 'Bromley', 'Camberwell', 'Camden',
  'Canary Wharf', 'Canonbury', 'Clapham', 'Clerkenwell', 'Dalston',
  'Deptford', 'Earls Court', 'East Dulwich', 'Elephant and Castle',
  'Finsbury Park', 'Fulham', 'Greenwich', 'Hackney', 'Hackney Wick',
  'Hammersmith', 'Hampstead', 'Highbury', 'Highgate', 'Hoxton',
  'Islington', 'Kennington', 'Kentish Town', 'Kingsland',
  'Ladbroke Grove', 'Lewisham', 'Leyton', 'London Fields',
  'Mile End', 'New Cross', 'Notting Hill', 'Peckham', 'Poplar',
  'Primrose Hill', 'Putney', 'Queens Park', 'Shepherd Bush',
  'Shoreditch', 'Soho', 'Stepney', 'Stockwell', 'Stoke Newington',
  'Stratford', 'Streatham', 'Tooting', 'Tower Hamlets', 'Vauxhall',
  'Walthamstow', 'Wandsworth', 'West Brompton', 'Whitechapel',
  'E1', 'E2', 'E3', 'E5', 'E8', 'E9', 'E10', 'E11', 'E14', 'E15', 'E17',
  'EC1', 'EC2', 'EC3', 'EC4',
  'N1', 'N4', 'N5', 'N6', 'N7', 'N8', 'N16', 'N19',
  'NW1', 'NW2', 'NW3', 'NW5', 'NW6', 'NW8', 'NW10',
  'SE1', 'SE4', 'SE5', 'SE8', 'SE10', 'SE11', 'SE13', 'SE15', 'SE16', 'SE17', 'SE22', 'SE24',
  'SW2', 'SW4', 'SW6', 'SW8', 'SW9', 'SW11', 'SW12', 'SW15', 'SW16', 'SW18',
  'W1', 'W2', 'W6', 'W9', 'W10', 'W11', 'W12', 'W14',
  'WC1', 'WC2',
]

export default function SearchBarClient({
  location,
  listingType,
  minBeds,
  maxPrice,
}: {
  location: string
  listingType: string
  minBeds: number | null
  maxPrice: number | null
}) {
  const [value, setValue] = useState(location)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setValue(val)
    if (val.length > 0) {
      const matches = SUGGESTIONS.filter(s =>
        s.toLowerCase().startsWith(val.toLowerCase())
      ).slice(0, 7)
      setSuggestions(matches)
      setOpen(matches.length > 0)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  function handleSelect(suggestion: string) {
    setValue(suggestion)
    setOpen(false)
    doSearch(suggestion)
  }

  function doSearch(loc: string) {
    const params = new URLSearchParams()
    if (loc) params.set('location', loc)
    params.set('type', listingType)
    if (minBeds) params.set('minBeds', String(minBeds))
    if (maxPrice) params.set('maxPrice', String(maxPrice))
    router.push('/search?' + params.toString())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    doSearch(value)
  }

  return (
    <div ref={ref} className="relative max-w-2xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5"/>
              <path d="m21 21-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            value={value}
            onChange={handleChange}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            className="w-full border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-stone-800 outline-none focus:border-green-700"
            placeholder="Area, postcode or station — e.g. Hackney, E8"
            autoComplete="off"
          />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5"
                >
                  <svg className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="1.5"/>
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="1.5"/>
                  </svg>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-green-800 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-green-900 transition-colors flex-shrink-0"
        >
          Search
        </button>
      </form>
    </div>
  )
}
