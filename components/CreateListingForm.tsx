'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface ExistingListing {
  id: string
  status?: string | null
  address?: string
  postcode?: string
  property_type?: string
  bedrooms?: number | string | null
  bathrooms?: number | string | null
  square_feet?: number | string | null
  price?: number | string | null
  description?: string
  images?: string[]
  floorplans?: string[]
  furnished?: string
  listing_type?: string
  which_floor?: string
  total_floors?: string
  floor_layout?: string
  epc_rating?: string
  council_tax_band?: string
  deposit?: string
  available_from?: string
  features?: string[]
  contact?: { name?: string, email?: string, phone?: string, company_name?: string, company_reg?: string }
}

interface Props {
  lister: 'private' | 'landlord' | 'agent'
  defaultListingType?: 'rent' | 'buy'
  defaultName?: string
  defaultEmail?: string
  defaultPhone?: string
  /** If provided, the form runs in edit mode and PATCHes /api/listings/edit/<id> on submit. */
  existing?: ExistingListing
}

const PROPERTY_TYPES = ['Flat', 'House', 'Studio', 'Maisonette', 'Bungalow', 'Room']
const FURNISHED_OPTIONS = ['Furnished', 'Unfurnished', 'Part furnished']
const FLOOR_OPTIONS = ['Ground floor', '1st floor', '2nd floor', '3rd floor', '4th floor', '5th floor+', 'Top floor', 'Lower ground floor']
const FLOOR_LAYOUT_OPTIONS = ['Single level', 'Split-level', 'Multiple floors']
const EPC_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const COUNCIL_TAX_BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function CreateListingForm({ lister, defaultListingType = 'rent', defaultName = '', defaultEmail = '', defaultPhone = '', existing }: Props) {
  const isEditMode = !!existing
  const ex = existing || ({} as ExistingListing)
  const exFeatures = ex.features || []
  const has = (f: string) => exFeatures.includes(f)
  // Photo upload caps — agents typically have 20-40 professional photos from
  // CRM exports, private owners take fewer.
  const MAX_PHOTOS = lister === 'agent' ? 35 : 20
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [valuation, setValuation] = useState<{ low: number; mid: number; high: number; n_comparables: number; area_label: string } | null>(null)
  const [valuationLoading, setValuationLoading] = useState(false)
  const [valuationError, setValuationError] = useState<string | null>(null)

  async function fetchValuation() {
    setValuationLoading(true); setValuationError(null); setValuation(null)
    try {
      const res = await fetch('/api/valuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_type: form.listing_type,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          square_feet: form.square_feet ? parseInt(form.square_feet) : null,
          property_type: form.property_type,
          postcode: form.postcode,
          epc_rating: form.epc_rating || null,
        }),
      })
      const data = await res.json()
      if (data.result) setValuation(data.result)
      else setValuationError('Not enough comparable listings in this area to estimate a price.')
    } catch {
      setValuationError('Could not fetch valuation.')
    }
    setValuationLoading(false)
  }
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [floorplanFiles, setFloorplanFiles] = useState<File[]>([])
  const [floorplanPreviews, setFloorplanPreviews] = useState<string[]>([])
  // In edit mode, existing image/floorplan URLs that the user hasn't removed.
  // These get passed straight to the server alongside any newly uploaded files.
  const [existingImages, setExistingImages] = useState<string[]>(ex.images || [])
  const [existingFloorplans, setExistingFloorplans] = useState<string[]>(ex.floorplans || [])
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<{name: string, email: string, phone: string} | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const floorplanFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      setAuthToken(session?.access_token || null)
      if (session?.user) {
        const u = session.user
        const name = u.user_metadata?.agency_name || u.user_metadata?.full_name || u.user_metadata?.name || u.email || ''
        const email = u.email || ''
        const phone = u.user_metadata?.phone || ''
        setUser({ name, email, phone })
        setForm(f => ({ ...f, name, email, phone }))
        // Skip step 1 since we have their details
        setStep(2)
      }
    })
  }, [])

  const [form, setForm] = useState({
    // Contact
    name: ex.contact?.name || defaultName,
    email: ex.contact?.email || defaultEmail || '',
    phone: ex.contact?.phone || defaultPhone || '',
    company_name: ex.contact?.company_name || '',
    company_reg: ex.contact?.company_reg || '',
    // Property
    address: ex.address || '',
    borough: '',
    postcode: ex.postcode || '',
    property_type: ex.property_type || 'Flat',
    listing_type: (ex.listing_type as 'rent' | 'buy') || defaultListingType,
    bedrooms: ex.bedrooms != null ? String(ex.bedrooms) : '',
    bathrooms: ex.bathrooms != null ? String(ex.bathrooms) : '',
    square_feet: ex.square_feet != null ? String(ex.square_feet) : '',
    which_floor: ex.which_floor || '',
    total_floors: ex.total_floors || '',
    floor_layout: ex.floor_layout || '',
    // Price & availability
    price: ex.price != null ? String(ex.price) : '',
    deposit: ex.deposit || '',
    available_from: ex.available_from || '',
    // Details
    furnished: ex.furnished ? ex.furnished.split(',').map(s => s.trim()).filter(Boolean) : [] as string[],
    epc_rating: ex.epc_rating || '',
    council_tax_band: ex.council_tax_band || '',
    description: ex.description || '',
    // Features
    has_garden: has('Garden'),
    has_balcony: has('Balcony'),
    has_terrace: has('Terrace'),
    has_parking: has('Parking'),
    has_garage: has('Garage'),
    has_concierge: has('Concierge'),
    pets_allowed: has('Pets allowed'),
    bills_included: has('Bills included'),
    has_lift: has('Lift'),
    has_porter: has('Porter'),
    new_build: has('New build'),
    shared_ownership: has('Shared ownership'),
  })

  function set(k: string, v: any) { setForm(f => ({...f, [k]: v})); if (error) setError('') }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.name.trim()) return 'Please enter your full name'
      if (!form.email.trim()) return 'Please enter your email address'
    }
    if (step === 2) {
      if (!form.address.trim()) return 'Please enter the property address'
      if (!form.postcode.trim()) return 'Please enter the postcode'
      if (!form.bedrooms) return 'Please select the number of bedrooms'
    }
    if (step === 3) {
      if (!form.price) return form.listing_type === 'buy' ? 'Please enter the asking price' : 'Please enter the monthly rent'
      if (!form.available_from) return 'Please enter the available from date'
    }
    if (step === 4) {
      if (!form.description.trim()) return 'Please add a description of the property'
    }
    return null
  }

  function handleContinue() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  // Memory-friendly previews: object URLs instead of data URLs (which copy
  // the whole file into memory as base64). Object URLs are cheap pointers.
  function handleFloorplans(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setFloorplanFiles(prev => [...prev, ...files].slice(0, 3))
    setFloorplanPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 3))
  }
  function removeFloorplan(i: number) {
    setFloorplanPreviews(prev => {
      const url = prev[i]
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return prev.filter((_, idx) => idx !== i)
    })
    setFloorplanFiles(prev => prev.filter((_, idx) => idx !== i))
  }
  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files].slice(0, MAX_PHOTOS))
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, MAX_PHOTOS))
  }
  function removeImage(i: number) {
    setImagePreviews(prev => {
      const url = prev[i]
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return prev.filter((_, idx) => idx !== i)
    })
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    // Paused listings: ask user whether to resubmit on save
    let resubmit = false
    if (isEditMode && ex.status === 'paused') {
      resubmit = confirm('This listing is currently paused. Send it back to the admin review queue?\n\nClick OK to resubmit for review, or Cancel to save changes and keep it paused.')
    }
    setLoading(true)
    setError('')
    try {
      // Resize big photos to max 2000px wide before upload. Keeps quality but
      // cuts a 5MB iPhone shot to ~400KB. Skip if already small or non-image.
      async function compressImage(file: File, maxWidth = 2000, quality = 0.85): Promise<File> {
        if (!file.type.startsWith('image/')) return file
        if (file.size < 500 * 1024) return file  // already small
        try {
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image()
            i.onload = () => res(i)
            i.onerror = rej
            i.src = URL.createObjectURL(file)
          })
          if (img.width <= maxWidth) {
            URL.revokeObjectURL(img.src)
            return file  // no resize needed
          }
          const scale = maxWidth / img.width
          const canvas = document.createElement('canvas')
          canvas.width = maxWidth
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          if (!ctx) { URL.revokeObjectURL(img.src); return file }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          URL.revokeObjectURL(img.src)
          const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality))
          if (!blob) return file
          // Preserve original filename, switch extension to .jpg
          const baseName = file.name.replace(/\.[^.]+$/, '')
          return new File([blob], baseName + '.jpg', { type: 'image/jpeg' })
        } catch { return file }
      }

      async function uploadAll(files: File[]): Promise<string[]> {
        const urls: string[] = []
        for (const file of files) {
          try {
            const compressed = await compressImage(file)
            const fd = new FormData()
            fd.append('file', compressed)
            const r = await fetch('/api/listings/upload-image', { method: 'POST', body: fd })
            if (r.ok) {
              const d = await r.json()
              if (d.url) urls.push(d.url)
            }
          } catch {}
        }
        return urls
      }

      const newImageUrls = await uploadAll(imageFiles)
      const newFloorplanUrls = await uploadAll(floorplanFiles)
      const imageUrls = [...existingImages, ...newImageUrls]
      const floorplanUrls = [...existingFloorplans, ...newFloorplanUrls]

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const endpoint = isEditMode ? `/api/listings/edit/${existing!.id}` : '/api/listings/create'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify({ ...form, images: imageUrls, floorplans: floorplanUrls, lister, resubmit })
      })
      const text = await res.text()
      console.log('API response:', res.status, text)
      let data: any = {}
      try { data = JSON.parse(text) } catch { throw new Error('Server error — please try again') }
      if (!res.ok) throw new Error(data.error || 'Failed to create listing')
      if (data?.status) setSavedStatus(data.status as string)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'rgba(211,117,90,0.12)'}}>
        <svg className="w-8 h-8" fill="none" stroke="#D3755A" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>{isEditMode ? 'Changes saved!' : 'Listing submitted!'}</h2>
      <p className="text-[#3D3A38] text-sm mb-8">
        {isEditMode
          ? (savedStatus === 'paused'
              ? 'Your changes have been saved. The listing remains paused — click "Resubmit for review" below when you\'re ready to post it on NestLondon.'
              : 'Your listing has been resubmitted for review. It will be hidden from the site until approved.')
          : <>Your property will be reviewed and published within 24 hours. We&apos;ll email you at {form.email}.</>}
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        {savedStatus === 'paused' && isEditMode && (
          <button onClick={async () => {
            const r = await fetch('/api/listings/manage', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listing_id: existing!.id, action: 'resubmit' }),
            })
            if (r.ok) {
              router.push(lister === 'agent' ? '/dashboard?tab=listings' : '/dashboard/owner')
            } else {
              const d = await r.json().catch(() => ({}))
              alert(d.error || 'Could not resubmit')
            }
          }} className="px-6 py-3 rounded-xl text-white text-sm" style={{background:'#D3755A'}}>Resubmit for review →</button>
        )}
        <button onClick={() => router.push(lister === 'agent' ? '/dashboard?tab=listings' : '/dashboard/owner')}
          className={savedStatus === 'paused' && isEditMode
            ? 'px-6 py-3 rounded-xl border border-[#E8E2DA] text-[#3D3A38] text-sm hover:bg-[#F5EBE0] transition-colors'
            : 'px-6 py-3 rounded-xl text-white text-sm'}
          style={savedStatus === 'paused' && isEditMode ? {} : {background:'#D3755A'}}>
          View your dashboard →
        </button>
      </div>
    </div>
  )

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-3 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white transition-colors"
  const labelClass = "block text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1.5"
  const selectClass = inputClass

  const FeatureToggle = ({ k, label }: { k: string, label: string }) => (
    <button type="button" onClick={() => set(k, !(form as any)[k])}
      className={'text-sm px-4 py-2 rounded-xl border transition-colors ' + ((form as any)[k] ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
      style={(form as any)[k] ? {background:'#D3755A'} : {}}>
      {(form as any)[k] ? '✓ ' : ''}{label}
    </button>
  )

  const steps = user ? ['Property', 'Price', 'Features', 'Photos'] : ['Contact', 'Property', 'Price', 'Features', 'Photos']

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-8">
        {steps.map((s, i) => {
          const stepNum = user ? i + 2 : i + 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={'h-1 w-full rounded-full transition-colors'} style={{background: step >= stepNum ? '#D3755A' : '#E8E2DA', opacity: step >= stepNum ? 1 : 0.35}} />
              <span className={'text-xs transition-colors whitespace-nowrap ' + (step === stepNum ? 'text-[#D3755A] font-medium' : 'text-[#9B928E]')}>{s}</span>
            </div>
          )
        })}
      </div>
      {user && (
        <div className="flex items-center gap-2 bg-[#F5EBE0] rounded-xl px-4 py-2.5 mb-5 text-xs text-[#3D3A38]">
          <svg className="w-3.5 h-3.5 text-[#D3755A] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Listing as <strong className="ml-1">{user.name || user.email}</strong>
        </div>
      )}

      {/* Step 1: Contact */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {lister !== 'agent' && <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Your contact details</h2>}
          {lister !== 'agent' && <div>
            <label className={labelClass}>Full name *</label>
            <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
          </div>}
          {lister !== 'agent' && <div>
            <label className={labelClass}>Email address *</label>
            <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
          </div>}
          {lister !== 'agent' && <div>
            <label className={labelClass}>Phone number</label>
            <input type="tel" className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 900000" />
          </div>}
          {lister === 'landlord' && <>
            <div>
              <label className={labelClass}>Company name (optional)</label>
              <input className={inputClass} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Smith Properties Ltd" />
            </div>
            <div>
              <label className={labelClass}>Company registration number (optional)</label>
              <input className={inputClass} value={form.company_reg} onChange={e => set('company_reg', e.target.value)} placeholder="12345678" />
            </div>
          </>}
        </div>
      )}

      {/* Step 2: Property details */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Property details</h2>
          <div>
            <label className={labelClass}>Full address *</label>
            <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} placeholder="12 Acacia Avenue, Hackney" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Borough</label>
              <input className={inputClass} value={form.borough} onChange={e => set('borough', e.target.value)} placeholder="Hackney" />
            </div>
            <div>
              <label className={labelClass}>Postcode *</label>
              <input className={inputClass} value={form.postcode} onChange={e => set('postcode', e.target.value)} placeholder="E8 1AB" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Listing type</label>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5EBE0] text-sm text-[#1B2E4B]">
              {form.listing_type === 'buy' ? 'For sale' : 'To let'}
            </div>
          </div>
          <div>
            <label className={labelClass}>Property type *</label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => (
                <button key={t} type="button" onClick={() => set('property_type', t)}
                  className={'text-sm px-4 py-2 rounded-xl border transition-colors ' + (form.property_type === t ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                  style={form.property_type === t ? {background:'#D3755A'} : {}}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Bedrooms *</label>
              <select className={selectClass} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)}>
                <option value="">Select</option>
                <option value="0">Studio</option>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <select className={selectClass} value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)}>
                <option value="">Select</option>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Size (sq ft)</label>
            <input type="number" className={inputClass} value={form.square_feet} onChange={e => set('square_feet', e.target.value)} placeholder="e.g. 650" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Which floor</label>
              <select className={selectClass} value={form.which_floor} onChange={e => set('which_floor', e.target.value)}>
                <option value="">Select</option>
                {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Total floors in building</label>
              <select className={selectClass} value={form.total_floors} onChange={e => set('total_floors', e.target.value)}>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                <option value="10+">10+</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Floor layout</label>
            <div className="flex flex-wrap gap-2">
              {FLOOR_LAYOUT_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => set('floor_layout', form.floor_layout === opt ? '' : opt)}
                  className={'text-sm px-4 py-2 rounded-xl border transition-colors ' + (form.floor_layout === opt ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                  style={form.floor_layout === opt ? {background:'#D3755A'} : {}}>{opt}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>EPC rating</label>
              <select className={selectClass} value={form.epc_rating} onChange={e => set('epc_rating', e.target.value)}>
                <option value="">Select</option>
                {EPC_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Council tax band</label>
              <select className={selectClass} value={form.council_tax_band} onChange={e => set('council_tax_band', e.target.value)}>
                <option value="">Select</option>
                {COUNCIL_TAX_BANDS.map(b => <option key={b} value={b}>Band {b}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Price & availability */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Price & availability</h2>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>{form.listing_type === 'buy' ? 'Asking price (£) *' : 'Monthly rent (£) *'}</label>
              <button type="button" onClick={fetchValuation} disabled={valuationLoading || !form.square_feet || !form.bedrooms || !form.postcode}
                className="text-xs text-[#D3755A] hover:underline disabled:text-[#C8C4BF] disabled:no-underline disabled:cursor-not-allowed">
                {valuationLoading ? 'Calculating…' : 'Suggest a price'}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B928E] text-sm">£</span>
              <input type="number" className={inputClass + " pl-8"} value={form.price} onChange={e => set('price', e.target.value)} placeholder={form.listing_type === 'buy' ? '450000' : '1800'} />
            </div>
            {valuation && (
              <div className="mt-2 bg-[#F5EBE0] rounded-xl p-3 text-xs text-[#1B2E4B]">
                <div className="flex items-center justify-between mb-1">
                  <span>Suggested: <span className="font-semibold">£{valuation.mid.toLocaleString()}{form.listing_type === 'rent' ? '/mo' : ''}</span></span>
                  <button type="button" onClick={() => set('price', String(valuation.mid))} className="text-[#D3755A] hover:underline">Use this</button>
                </div>
                <div className="text-[10px] text-[#9B928E]">Range: £{valuation.low.toLocaleString()}–£{valuation.high.toLocaleString()} · {valuation.n_comparables} comparables in {valuation.area_label}</div>
              </div>
            )}
            {valuationError && (
              <div className="mt-2 text-xs text-[#9B928E]">{valuationError}</div>
            )}
          </div>
          <div>
            <label className={labelClass}>Deposit (£)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B928E] text-sm">£</span>
              <input type="number" className={inputClass + " pl-8"} value={form.deposit} onChange={e => set('deposit', e.target.value)} placeholder="2076" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Available from *</label>
            <input type="date" className={inputClass} value={form.available_from} onChange={e => set('available_from', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Furnished status (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {FURNISHED_OPTIONS.map(f => {
                const sel = (form.furnished as string[]).includes(f)
                return (
                  <button key={f} type="button"
                    onClick={() => set('furnished', sel ? (form.furnished as string[]).filter(x => x !== f) : [...(form.furnished as string[]), f])}
                    className={'text-sm px-4 py-2 rounded-xl border transition-colors ' + (sel ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                    style={sel ? {background:'#D3755A'} : {}}>
                    {sel ? '✓ ' : ''}{f}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Description & features */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Description & features</h2>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea className={inputClass + " resize-none h-32"} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the property — layout, condition, local amenities, transport links, who it suits..." />
          </div>
          <div>
            <label className={labelClass}>Outside space</label>
            <div className="flex flex-wrap gap-2">
              <FeatureToggle k="has_garden" label="Garden" />
              <FeatureToggle k="has_balcony" label="Balcony" />
              <FeatureToggle k="has_terrace" label="Terrace" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Parking</label>
            <div className="flex flex-wrap gap-2">
              <FeatureToggle k="has_parking" label="Parking space" />
              <FeatureToggle k="has_garage" label="Garage" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Building features</label>
            <div className="flex flex-wrap gap-2">
              <FeatureToggle k="has_concierge" label="Concierge" />
              <FeatureToggle k="has_lift" label="Lift" />
              <FeatureToggle k="has_porter" label="Porter" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Rental terms</label>
            <div className="flex flex-wrap gap-2">
              <FeatureToggle k="pets_allowed" label="Pets allowed" />
              <FeatureToggle k="bills_included" label="Bills included" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Property type details</label>
            <div className="flex flex-wrap gap-2">
              <FeatureToggle k="new_build" label="New build" />
              <FeatureToggle k="shared_ownership" label="Shared ownership" />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Photos */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Photos</h2>
          <p className="text-sm text-[#9B928E]">{'Add up to ' + MAX_PHOTOS + ' photos. Good photos significantly increase enquiries — try to include every room, outside space, and any special features.'}</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#E8E2DA] rounded-xl p-8 text-center cursor-pointer hover:border-[#D3755A] transition-colors">
            <svg className="w-8 h-8 mx-auto mb-2 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm text-[#9B928E]">Click to upload photos</p>
            <p className="text-xs text-[#9B928E] mt-1">JPG, PNG up to 10MB each · {imagePreviews.length}/{MAX_PHOTOS} uploaded</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
          </div>
          {existingImages.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {existingImages.map((src, i) => (
                <div key={'ex-' + i} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  {i === 0 && imagePreviews.length === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>}
                </div>
              ))}
            </div>
          )}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={src} className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  {i === 0 && existingImages.length === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#E8E2DA] pt-5 mt-2">
            <h3 className="text-base font-light text-[#1B2E4B] mb-1" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Floorplan</h3>
            <p className="text-sm text-[#9B928E] mb-3">Adding a floorplan can greatly increase engagement with your listing.</p>
            <div
              onClick={() => floorplanFileRef.current?.click()}
              className="border-2 border-dashed border-[#E8E2DA] rounded-xl p-6 text-center cursor-pointer hover:border-[#D3755A] transition-colors">
              <svg className="w-7 h-7 mx-auto mb-2 text-[#9B928E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" strokeWidth="1.5"/>
              </svg>
              <p className="text-sm text-[#9B928E]">Click to upload floorplan</p>
              <p className="text-xs text-[#9B928E] mt-1">JPG, PNG up to 10MB · {floorplanPreviews.length}/3 uploaded</p>
              <input ref={floorplanFileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFloorplans} />
            </div>
            {existingFloorplans.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {existingFloorplans.map((src, i) => (
                  <div key={'ex-fp-' + i} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-stone-100">
                    <img src={src} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    <button type="button" onClick={() => setExistingFloorplans(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
            {floorplanPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {floorplanPreviews.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-stone-100">
                    <img src={src} className="w-full h-full object-contain" />
                    <button onClick={() => removeFloorplan(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation error */}
      {error && <div className="mt-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        {step > (user ? 2 : 1) && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38] hover:border-[#D3755A] transition-colors">
            ← Back
          </button>
        )}
        {step < 5 ? (
          <button onClick={handleContinue}
            className="flex-1 py-3 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{background:'#D3755A'}}>
            Continue →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{background:'#1B2E4B'}}>
            {loading ? 'Submitting...' : (isEditMode ? 'Save changes' : 'Submit listing')}
          </button>
        )}
      </div>
    </div>
  )
}
