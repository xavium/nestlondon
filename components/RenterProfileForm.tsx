'use client'

import { useState, useEffect } from 'react'

const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"
const labelClass = "text-xs text-[#9B928E] uppercase tracking-wide mb-1 block"
const selectClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] transition-colors bg-white"

interface RenterProfile {
  full_name?: string
  phone?: string
  current_address?: string
  employment_status?: string
  employer_name?: string
  job_title?: string
  annual_income?: number | null
  employment_length?: string
  current_landlord_name?: string
  current_landlord_phone?: string
  reason_for_moving?: string
  time_at_current_address?: string
  move_in_date?: string
  tenancy_length?: string
  num_occupants?: number | null
  has_pets?: boolean
  pet_details?: string
  is_smoker?: boolean
  right_to_rent?: string
  visa_type?: string
  visa_expiry?: string
  employer_ref_name?: string
  employer_ref_email?: string
  landlord_ref_name?: string
  landlord_ref_email?: string
  credit_check_consent?: boolean
  additional_info?: string
}

function completeness(p: RenterProfile): number {
  const fields = [
    p.full_name, p.phone, p.current_address,
    p.employment_status, p.employer_name, p.annual_income,
    p.time_at_current_address, p.reason_for_moving,
    p.move_in_date, p.tenancy_length, p.num_occupants,
    p.right_to_rent,
  ]
  const filled = fields.filter(f => f !== undefined && f !== null && f !== '').length
  return Math.round((filled / fields.length) * 100)
}

export default function RenterProfileForm() {
  const [profile, setProfile] = useState<RenterProfile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetch('/api/account/renter-profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setProfile(d.profile) })
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof RenterProfile, value: any) {
    setProfile(p => ({ ...p, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/account/renter-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); setSaving(false); return }
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const score = completeness(profile)

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 border-2 border-[#D3755A] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">

      {/* Score card */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Renter profile</h2>
            <p className="text-xs text-[#9B928E] mt-1">Shared with agents and owners when you make an enquiry. A complete profile gets faster responses.</p>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] hover:bg-[#F5EBE0] hover:border-[#D3755A] hover:text-[#D3755A] transition-colors flex-shrink-0">
              {score === 0 ? 'Complete profile' : 'Edit profile'}
            </button>
          )}
        </div>

        {/* Completeness bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-[#F0EBE5] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: score + '%', background: score >= 80 ? '#4CAF50' : score >= 50 ? '#D3755A' : '#E8C4B8' }} />
          </div>
          <span className="text-xs font-semibold text-[#1B2E4B] flex-shrink-0">{score}% complete</span>
        </div>

        {score === 0 && !editing && (
          <p className="text-xs text-[#9B928E] mt-3">Fill out your profile to help landlords and agents assess your application quickly.</p>
        )}

        {saved && <div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl px-3 py-2">Profile saved successfully.</div>}
      </div>

      {editing && (
        <form onSubmit={save} className="flex flex-col gap-5">

          {/* Personal details */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#1B2E4B] mb-4">Personal details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full name</label>
                <input value={profile.full_name || ''} onChange={e => set('full_name', e.target.value)} className={inputClass} placeholder="Jane Smith" />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input value={profile.phone || ''} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="+44 7700 000000" type="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Current address</label>
                <input value={profile.current_address || ''} onChange={e => set('current_address', e.target.value)} className={inputClass} placeholder="12 Example Street, London E1 6RF" />
              </div>
              <div>
                <label className={labelClass}>Time at current address</label>
                <input value={profile.time_at_current_address || ''} onChange={e => set('time_at_current_address', e.target.value)} className={inputClass} placeholder="2 years" />
              </div>
              <div>
                <label className={labelClass}>Reason for moving</label>
                <input value={profile.reason_for_moving || ''} onChange={e => set('reason_for_moving', e.target.value)} className={inputClass} placeholder="Relocating for work" />
              </div>
            </div>
          </div>

          {/* Employment */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#1B2E4B] mb-4">Employment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Employment status</label>
                <select value={profile.employment_status || ''} onChange={e => set('employment_status', e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="employed">Employed full-time</option>
                  <option value="employed_part">Employed part-time</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Employer / company name</label>
                <input value={profile.employer_name || ''} onChange={e => set('employer_name', e.target.value)} className={inputClass} placeholder="Acme Ltd" />
              </div>
              <div>
                <label className={labelClass}>Job title</label>
                <input value={profile.job_title || ''} onChange={e => set('job_title', e.target.value)} className={inputClass} placeholder="Software Engineer" />
              </div>
              <div>
                <label className={labelClass}>Annual income (£)</label>
                <input type="number" value={profile.annual_income || ''} onChange={e => set('annual_income', parseInt(e.target.value) || null)} className={inputClass} placeholder="45000" />
              </div>
              <div>
                <label className={labelClass}>Length of employment</label>
                <input value={profile.employment_length || ''} onChange={e => set('employment_length', e.target.value)} className={inputClass} placeholder="3 years" />
              </div>
            </div>
          </div>

          {/* Tenancy preferences */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#1B2E4B] mb-4">Tenancy preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Preferred move-in date</label>
                <input type="date" value={profile.move_in_date || ''} onChange={e => set('move_in_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tenancy length</label>
                <select value={profile.tenancy_length || ''} onChange={e => set('tenancy_length', e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="6 months">6 months</option>
                  <option value="12 months">12 months</option>
                  <option value="18 months">18 months</option>
                  <option value="24 months">24 months</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Number of occupants</label>
                <input type="number" min="1" max="10" value={profile.num_occupants || ''} onChange={e => set('num_occupants', parseInt(e.target.value) || null)} className={inputClass} placeholder="2" />
              </div>
              <div className="flex flex-col gap-3 justify-center pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!profile.has_pets} onChange={e => set('has_pets', e.target.checked)} className="w-4 h-4 rounded accent-[#D3755A]" />
                  <span className="text-sm text-[#1B2E4B]">I have pets</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!profile.is_smoker} onChange={e => set('is_smoker', e.target.checked)} className="w-4 h-4 rounded accent-[#D3755A]" />
                  <span className="text-sm text-[#1B2E4B]">I smoke</span>
                </label>
              </div>
              {profile.has_pets && (
                <div className="sm:col-span-2">
                  <label className={labelClass}>Pet details</label>
                  <input value={profile.pet_details || ''} onChange={e => set('pet_details', e.target.value)} className={inputClass} placeholder="1 small dog, house-trained" />
                </div>
              )}
            </div>
          </div>

          {/* Right to rent */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#1B2E4B] mb-1">Right to rent</h3>
            <p className="text-xs text-[#9B928E] mb-4">Landlords are legally required to verify your right to rent in the UK.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status</label>
                <select value={profile.right_to_rent || ''} onChange={e => set('right_to_rent', e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="uk_citizen">UK citizen / British passport</option>
                  <option value="eu_settled">EU settled / pre-settled status</option>
                  <option value="visa">Visa holder</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {profile.right_to_rent === 'visa' && (
                <>
                  <div>
                    <label className={labelClass}>Visa type</label>
                    <input value={profile.visa_type || ''} onChange={e => set('visa_type', e.target.value)} className={inputClass} placeholder="Skilled Worker Visa" />
                  </div>
                  <div>
                    <label className={labelClass}>Visa expiry</label>
                    <input type="date" value={profile.visa_expiry || ''} onChange={e => set('visa_expiry', e.target.value)} className={inputClass} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional info */}
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#1B2E4B] mb-4">Additional information</h3>
            <div>
              <label className={labelClass}>Anything else you'd like agents to know?</label>
              <textarea value={profile.additional_info || ''} onChange={e => set('additional_info', e.target.value)}
                className={inputClass + ' min-h-20 resize-none'}
                placeholder="e.g. I work from home, I am a non-smoker, I have excellent references..." />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setEditing(false)}
              className="px-5 py-2.5 rounded-xl border border-[#E8E2DA] text-sm text-[#3D3A38] hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: '#D3755A' }}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>

        </form>
      )}
    </div>
  )
}
