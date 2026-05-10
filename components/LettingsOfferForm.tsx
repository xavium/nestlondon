'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Tenant {
  name: string
  phone: string
  email: string
  occupation: string
  employer_name: string
  employer_address: string
  salary: string
}

interface Guarantor {
  name: string
  phone: string
  email: string
  occupation: string
  employer_address: string
  salary: string
  based_in: 'uk' | 'abroad' | ''
}

interface Props {
  listingId: string
  listedPrice: number | null
  user: { email: string; name: string; phone: string }
  profile: any | null
}

const emptyTenant: Tenant = { name: '', phone: '', email: '', occupation: '', employer_name: '', employer_address: '', salary: '' }
const emptyGuarantor: Guarantor = { name: '', phone: '', email: '', occupation: '', employer_address: '', salary: '', based_in: '' }

export default function LettingsOfferForm({ listingId, listedPrice, user, profile }: Props) {
  const router = useRouter()

  // Offer basics
  const [offerAmount, setOfferAmount] = useState<string>(listedPrice ? String(listedPrice) : '')
  const [termLength, setTermLength] = useState<string>(profile?.tenancy_length || '12')
  const [furnished, setFurnished] = useState<string>('')
  const [moveInDate, setMoveInDate] = useState<string>(profile?.move_in_date || '')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [hasPets, setHasPets] = useState<boolean>(!!profile?.has_pets)
  const [petDetails, setPetDetails] = useState<string>(profile?.pet_details || '')
  const [combinedSalary, setCombinedSalary] = useState('')

  // Tenants — start with 1 prefilled with the user's details
  const [tenants, setTenants] = useState<Tenant[]>([{
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    occupation: profile?.job_title || '',
    employer_name: '',
    employer_address: '',
    salary: '',
  }])

  // Guarantor
  const [hasGuarantor, setHasGuarantor] = useState(false)
  const [guarantor, setGuarantor] = useState<Guarantor>(emptyGuarantor)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
  const labelClass = "text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1 block"
  const sectionHeading = "text-sm font-semibold text-[#1B2E4B] border-b border-[#E8E2DA] pb-2"

  function updateTenant(i: number, field: keyof Tenant, value: string) {
    setTenants(ts => ts.map((t, j) => j === i ? { ...t, [field]: value } : t))
  }
  function addTenant() { setTenants(ts => [...ts, { ...emptyTenant }]) }
  function removeTenant(i: number) { setTenants(ts => ts.filter((_, j) => j !== i)) }
  function updateGuarantor(field: keyof Guarantor, value: string) {
    setGuarantor(g => ({ ...g, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const primary = tenants[0]
    if (!primary?.name?.trim() || !primary?.phone?.trim()) {
      setError('Please provide at least one tenant name and phone number'); return
    }
    if (!offerAmount) { setError('Please enter your offer amount'); return }
    if (listedPrice != null && Number(offerAmount) > listedPrice) {
      setError(`Offer cannot exceed the listed price of £${listedPrice.toLocaleString()}/mo (Renters' Rights Act).`); return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        listing_id: listingId,
        offer_type: 'rent',
        // Primary contact fields (use first tenant for compat with existing schema)
        offerer_name: primary.name.trim(),
        offerer_email: primary.email.trim() || user.email,
        offerer_phone: primary.phone.trim(),
        offer_amount: Number(offerAmount),
        term_length_months: termLength ? Number(termLength) : null,
        num_tenants: tenants.length,
        move_in_date: moveInDate || null,
        has_pets: hasPets,
        pet_details: hasPets ? petDetails.trim() : null,
        furnished_preference: furnished || null,
        special_requirements: specialRequirements.trim() || null,
        combined_salary: combinedSalary ? Number(combinedSalary) : null,
        tenants: tenants.map(t => ({
          name: t.name.trim(),
          phone: t.phone.trim(),
          email: t.email.trim(),
          occupation: t.occupation.trim(),
          employer_name: t.employer_name.trim(),
          employer_address: t.employer_address.trim(),
          salary: t.salary ? Number(t.salary) : null,
        })),
        guarantor_available: hasGuarantor,
        guarantor_details: hasGuarantor ? {
          name: guarantor.name.trim(),
          phone: guarantor.phone.trim(),
          email: guarantor.email.trim(),
          occupation: guarantor.occupation.trim(),
          employer_address: guarantor.employer_address.trim(),
          salary: guarantor.salary ? Number(guarantor.salary) : null,
          based_in: guarantor.based_in,
        } : null,
      }
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit offer')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <h2 className="text-2xl font-light text-[#1B2E4B] mb-3" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>Offer submitted</h2>
        <p className="text-sm text-[#3D3A38] mb-6">The landlord will be notified and will respond via your dashboard.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/offers')} className="px-5 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38]">View my offers</button>
          <button onClick={() => router.push(`/listings/${listingId}`)} className="px-5 py-2.5 rounded-xl text-white text-sm font-medium" style={{background:'#D3755A'}}>Back to listing</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

      {/* Offer terms */}
      <div className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Offer terms</h2>
        <div>
          <label className={labelClass}>Monthly rent (£) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B928E] text-sm">£</span>
            <input required type="number" min="0" max={listedPrice ?? undefined} value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className={inputClass + ' pl-8'} />
          </div>
          {listedPrice && (
            <p className="text-xs text-[#9B928E] mt-1">
              Listed at £{listedPrice.toLocaleString()}/mo. Under the Renters' Rights Act, offers cannot exceed the advertised rent.
            </p>
          )}
          {listedPrice && Number(offerAmount) > listedPrice && (
            <p className="text-xs text-red-600 mt-1">Offer cannot exceed £{listedPrice.toLocaleString()}/mo.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Term of tenancy</label>
            <select value={termLength} onChange={e => setTermLength(e.target.value)} className={inputClass}>
              <option value="">Select</option><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Proposed move date</label>
            <input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Furnished or unfurnished</label>
          <select value={furnished} onChange={e => setFurnished(e.target.value)} className={inputClass}>
            <option value="">Either</option><option value="furnished">Furnished</option><option value="unfurnished">Unfurnished</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Special requirements</label>
          <textarea value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)} rows={3} className={inputClass + ' min-h-20 resize-none'} placeholder="e.g. parking needed, early access to measure up…" />
        </div>
      </div>

      {/* Tenants */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E8E2DA] pb-2">
          <h2 className="text-sm font-semibold text-[#1B2E4B]">Prospective tenants ({tenants.length})</h2>
          <button type="button" onClick={addTenant} className="text-xs text-[#D3755A] hover:underline">+ Add tenant</button>
        </div>
        {tenants.map((t, i) => (
          <div key={i} className="bg-[#FCFAF7] border border-[#E8E2DA] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#9B928E]">Tenant {i + 1}</span>
              {tenants.length > 1 && <button type="button" onClick={() => removeTenant(i)} className="text-xs text-red-500 hover:underline">Remove</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Full name {i === 0 ? '*' : ''}</label><input required={i === 0} value={t.name} onChange={e => updateTenant(i, 'name', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Phone {i === 0 ? '*' : ''}</label><input required={i === 0} type="tel" value={t.phone} onChange={e => updateTenant(i, 'phone', e.target.value)} className={inputClass} /></div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={t.email} onChange={e => updateTenant(i, 'email', e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Occupation</label><input value={t.occupation} onChange={e => updateTenant(i, 'occupation', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Salary (£)</label><input type="number" min="0" value={t.salary} onChange={e => updateTenant(i, 'salary', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Employer name</label><input value={t.employer_name} onChange={e => updateTenant(i, 'employer_name', e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Employer address</label><input value={t.employer_address} onChange={e => updateTenant(i, 'employer_address', e.target.value)} className={inputClass} /></div>
          </div>
        ))}
        <div>
          <label className={labelClass}>Combined salary (£)</label>
          <input type="number" min="0" value={combinedSalary} onChange={e => setCombinedSalary(e.target.value)} className={inputClass} placeholder="Total across all tenants (optional if given per tenant above)" />
        </div>
      </div>

      {/* Pets */}
      <div className="flex flex-col gap-3">
        <h2 className={sectionHeading}>Pets</h2>
        <label className="flex items-center gap-2 text-sm text-[#3D3A38]"><input type="checkbox" checked={hasPets} onChange={e => setHasPets(e.target.checked)} className="w-4 h-4 accent-[#D3755A]" />We have pet(s)</label>
        {hasPets && <div><label className={labelClass}>Pet details</label><input value={petDetails} onChange={e => setPetDetails(e.target.value)} className={inputClass} placeholder="e.g. 1 small dog, house-trained" /></div>}
      </div>

      {/* Guarantor */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#E8E2DA] pb-2">
          <h2 className="text-sm font-semibold text-[#1B2E4B]">Guarantor</h2>
          <label className="flex items-center gap-2 text-xs text-[#3D3A38]"><input type="checkbox" checked={hasGuarantor} onChange={e => setHasGuarantor(e.target.checked)} className="w-4 h-4 accent-[#D3755A]" />Guarantor available</label>
        </div>
        {hasGuarantor && (
          <div className="bg-[#FCFAF7] border border-[#E8E2DA] rounded-xl p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Full name</label><input value={guarantor.name} onChange={e => updateGuarantor('name', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Phone</label><input type="tel" value={guarantor.phone} onChange={e => updateGuarantor('phone', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Email</label><input type="email" value={guarantor.email} onChange={e => updateGuarantor('email', e.target.value)} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Occupation</label><input value={guarantor.occupation} onChange={e => updateGuarantor('occupation', e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Salary (£)</label><input type="number" min="0" value={guarantor.salary} onChange={e => updateGuarantor('salary', e.target.value)} className={inputClass} /></div>
            </div>
            <div><label className={labelClass}>Employer address</label><input value={guarantor.employer_address} onChange={e => updateGuarantor('employer_address', e.target.value)} className={inputClass} /></div>
            <div>
              <label className={labelClass}>Based in</label>
              <div className="flex gap-2">
                {(['uk', 'abroad'] as const).map(v => (
                  <button key={v} type="button" onClick={() => updateGuarantor('based_in', v)}
                    className={'text-sm px-4 py-2 rounded-xl border capitalize transition-colors ' + (guarantor.based_in === v ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
                    style={guarantor.based_in === v ? {background:'#D3755A'} : {}}>
                    {v === 'uk' ? 'UK' : 'Abroad'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl text-white text-sm font-medium mt-2 disabled:opacity-50 transition-opacity hover:opacity-90" style={{background:'#1B2E4B'}}>
        {submitting ? 'Submitting…' : 'Submit offer'}
      </button>
    </form>
  )
}
