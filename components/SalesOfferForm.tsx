'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Solicitor { firm_name_address: string; fee_earner: string; phone: string; email: string }
interface MortgageDetails { amount: string; lender: string; in_principle: boolean; proof_of_deposit_confirmed: boolean; broker_firm: string; broker_name: string; broker_phone: string; broker_email: string }
interface Gifting { gifter_name: string; amount: string; source: string; relationship: string; unconditional_confirmed: boolean }
interface Chain { estate_agent_name: string; agent_contact: string; phone: string; email: string; sale_address: string; agreed_sale_date: string; agreed_price: string; position: string }
interface Remortgage { funds_arranged: boolean; broker_firm: string; broker_name: string; broker_phone: string; broker_email: string }

interface Props {
  listingId: string
  listedPrice: number | null
  user: { email: string; name: string; phone: string }
}

type Scenario = 'cash' | 'mortgage' | 'gift' | 'chain' | 'remortgage'
const scenarioLabels: Record<Scenario, string> = {
  cash: 'Cash purchase',
  mortgage: 'Mortgage',
  gift: 'Gift',
  chain: 'In a chain (selling another property)',
  remortgage: 'Remortgage',
}

export default function SalesOfferForm({ listingId, listedPrice, user }: Props) {
  const router = useRouter()

  // Contact
  const [name, setName] = useState(user.name || '')
  const [email] = useState(user.email || '')
  const [homePhone, setHomePhone] = useState('')
  const [mobilePhone, setMobilePhone] = useState(user.phone || '')
  const [employment, setEmployment] = useState('')
  const [rentalNotice, setRentalNotice] = useState('')
  const [hasPets, setHasPets] = useState(false)
  const [petDetails, setPetDetails] = useState('')

  // Offer
  const [offerAmount, setOfferAmount] = useState<string>(listedPrice ? String(listedPrice) : '')
  const [exchangeDate, setExchangeDate] = useState('')
  const [completionDate, setCompletionDate] = useState('')
  const [specialTerms, setSpecialTerms] = useState('')

  // Solicitor
  const [solicitor, setSolicitor] = useState<Solicitor>({ firm_name_address: '', fee_earner: '', phone: '', email: '' })

  // Scenarios (multi-select)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const toggleScenario = (s: Scenario) => setScenarios(ss => ss.includes(s) ? ss.filter(x => x !== s) : [...ss, s])

  // Section data
  const [mortgage, setMortgage] = useState<MortgageDetails>({ amount: '', lender: '', in_principle: false, proof_of_deposit_confirmed: false, broker_firm: '', broker_name: '', broker_phone: '', broker_email: '' })
  const [gift, setGift] = useState<Gifting>({ gifter_name: '', amount: '', source: '', relationship: '', unconditional_confirmed: false })
  const [chain, setChain] = useState<Chain>({ estate_agent_name: '', agent_contact: '', phone: '', email: '', sale_address: '', agreed_sale_date: '', agreed_price: '', position: '' })
  const [remortgage, setRemortgage] = useState<Remortgage>({ funds_arranged: false, broker_firm: '', broker_name: '', broker_phone: '', broker_email: '' })

  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-4 py-2.5 text-sm text-[#1B2E4B] outline-none focus:border-[#D3755A] bg-white"
  const labelClass = "text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-1 block"
  const sectionHeading = "text-sm font-semibold text-[#1B2E4B] border-b border-[#E8E2DA] pb-2"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !mobilePhone.trim()) { setError('Please provide your name and mobile number'); return }
    if (!offerAmount) { setError('Please enter your offer amount'); return }
    if (!consent) { setError('Please grant consent to share your information with the owner'); return }
    setSubmitting(true)
    try {
      const payload: any = {
        listing_id: listingId,
        offer_type: 'buy',
        offerer_name: name.trim(),
        offerer_email: email,
        offerer_phone: mobilePhone.trim(),
        offer_amount: Number(offerAmount),
        employment_status: employment || null,
        home_phone: homePhone.trim() || null,
        rental_contract_notice: rentalNotice.trim() || null,
        has_pets: hasPets,
        pet_details: hasPets ? petDetails.trim() : null,
        anticipated_exchange_date: exchangeDate || null,
        anticipated_completion_date: completionDate || null,
        special_terms: specialTerms.trim() || null,
        solicitor: (solicitor.firm_name_address || solicitor.fee_earner) ? solicitor : null,
        funding_scenarios: scenarios,
        mortgage_details: scenarios.includes('mortgage') ? { ...mortgage, amount: mortgage.amount ? Number(mortgage.amount) : null } : null,
        gifting: scenarios.includes('gift') ? { ...gift, amount: gift.amount ? Number(gift.amount) : null } : null,
        chain: scenarios.includes('chain') ? { ...chain, agreed_price: chain.agreed_price ? Number(chain.agreed_price) : null } : null,
        remortgage: scenarios.includes('remortgage') ? remortgage : null,
        consent_to_share: consent,
        // Legacy fields for compat
        funding_source: scenarios.includes('cash') && scenarios.length === 1 ? 'cash' : scenarios.includes('mortgage') ? (scenarios.includes('gift') ? 'mix' : 'mortgage') : null,
        mortgage_in_principle: mortgage.in_principle,
        chain_position: scenarios.includes('chain') ? chain.position : scenarios.includes('cash') ? 'no_chain' : null,
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
        <p className="text-sm text-[#3D3A38] mb-6">The seller will be notified and will respond via your dashboard.</p>
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

      {/* Contact */}
      <div className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Contact details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Full name *</label><input required value={name} onChange={e => setName(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Email</label><input type="email" value={email} readOnly className={inputClass + " bg-[#F5EBE0]"} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Mobile *</label><input required type="tel" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Home number</label><input type="tel" value={homePhone} onChange={e => setHomePhone(e.target.value)} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Employment</label><input value={employment} onChange={e => setEmployment(e.target.value)} className={inputClass} placeholder="e.g. Software engineer at Acme Ltd" /></div>
        <div><label className={labelClass}>Are you in a rental contract? If yes, notice period</label><input value={rentalNotice} onChange={e => setRentalNotice(e.target.value)} className={inputClass} placeholder="e.g. 2 months notice" /></div>
        <div>
          <label className="flex items-center gap-2 text-sm text-[#3D3A38] mb-2"><input type="checkbox" checked={hasPets} onChange={e => setHasPets(e.target.checked)} className="w-4 h-4 accent-[#D3755A]" />Do you have a pet?</label>
          {hasPets && <input value={petDetails} onChange={e => setPetDetails(e.target.value)} className={inputClass} placeholder="Please provide more detail" />}
        </div>
      </div>

      {/* Offer */}
      <div className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Offer details</h2>
        <div>
          <label className={labelClass}>Amount of offer (£) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B928E] text-sm">£</span>
            <input required type="number" min="0" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className={inputClass + ' pl-8'} />
          </div>
          {listedPrice && <p className="text-xs text-[#9B928E] mt-1">Listed at £{listedPrice.toLocaleString()}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Anticipated exchange date</label><input type="date" value={exchangeDate} onChange={e => setExchangeDate(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Anticipated completion date</label><input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Special terms</label><textarea value={specialTerms} onChange={e => setSpecialTerms(e.target.value)} rows={3} className={inputClass + ' min-h-20 resize-none'} placeholder="e.g. subject to survey, subject to mortgage offer" /></div>
      </div>

      {/* Solicitor */}
      <div className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Solicitor</h2>
        <div><label className={labelClass}>Firm name & address</label><input value={solicitor.firm_name_address} onChange={e => setSolicitor(s => ({...s, firm_name_address: e.target.value}))} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Fee earner name</label><input value={solicitor.fee_earner} onChange={e => setSolicitor(s => ({...s, fee_earner: e.target.value}))} className={inputClass} /></div>
          <div><label className={labelClass}>Phone</label><input type="tel" value={solicitor.phone} onChange={e => setSolicitor(s => ({...s, phone: e.target.value}))} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Email</label><input type="email" value={solicitor.email} onChange={e => setSolicitor(s => ({...s, email: e.target.value}))} className={inputClass} /></div>
      </div>

      {/* Funding scenarios */}
      <div className="flex flex-col gap-3">
        <h2 className={sectionHeading}>Funding</h2>
        <p className="text-xs text-[#9B928E]">Select all that apply to your purchase.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(scenarioLabels) as Scenario[]).map(s => (
            <button key={s} type="button" onClick={() => toggleScenario(s)}
              className={'text-sm px-4 py-2 rounded-xl border transition-colors ' + (scenarios.includes(s) ? 'text-white border-transparent' : 'text-[#3D3A38] border-[#E8E2DA] hover:border-[#D3755A]')}
              style={scenarios.includes(s) ? {background:'#D3755A'} : {}}>
              {scenarioLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Mortgage section */}
      {scenarios.includes('mortgage') && (
        <div className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Mortgage</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Amount (£)</label><input type="number" min="0" value={mortgage.amount} onChange={e => setMortgage(m => ({...m, amount: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Lender</label><input value={mortgage.lender} onChange={e => setMortgage(m => ({...m, lender: e.target.value}))} className={inputClass} /></div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-[#3D3A38]"><input type="checkbox" checked={mortgage.in_principle} onChange={e => setMortgage(m => ({...m, in_principle: e.target.checked}))} className="w-4 h-4 accent-[#D3755A]" />Agreement/Decision in Principle obtained</label>
            <label className="flex items-center gap-2 text-sm text-[#3D3A38]"><input type="checkbox" checked={mortgage.proof_of_deposit_confirmed} onChange={e => setMortgage(m => ({...m, proof_of_deposit_confirmed: e.target.checked}))} className="w-4 h-4 accent-[#D3755A]" />I can provide proof of deposit</label>
          </div>
          <p className="text-xs text-[#9B928E]">Broker details (if using one)</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Broker firm</label><input value={mortgage.broker_firm} onChange={e => setMortgage(m => ({...m, broker_firm: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Broker name</label><input value={mortgage.broker_name} onChange={e => setMortgage(m => ({...m, broker_name: e.target.value}))} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Broker phone</label><input type="tel" value={mortgage.broker_phone} onChange={e => setMortgage(m => ({...m, broker_phone: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Broker email</label><input type="email" value={mortgage.broker_email} onChange={e => setMortgage(m => ({...m, broker_email: e.target.value}))} className={inputClass} /></div>
          </div>
        </div>
      )}

      {/* Gift section */}
      {scenarios.includes('gift') && (
        <div className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Gift</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Gifter's name</label><input value={gift.gifter_name} onChange={e => setGift(g => ({...g, gifter_name: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Amount (£)</label><input type="number" min="0" value={gift.amount} onChange={e => setGift(g => ({...g, amount: e.target.value}))} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Source of funds</label><input value={gift.source} onChange={e => setGift(g => ({...g, source: e.target.value}))} className={inputClass} placeholder="e.g. savings, inheritance, sale proceeds" /></div>
          <div><label className={labelClass}>Relationship to gifter</label><input value={gift.relationship} onChange={e => setGift(g => ({...g, relationship: e.target.value}))} className={inputClass} placeholder="e.g. parent, sibling" /></div>
          <label className="flex items-center gap-2 text-sm text-[#3D3A38]"><input type="checkbox" checked={gift.unconditional_confirmed} onChange={e => setGift(g => ({...g, unconditional_confirmed: e.target.checked}))} className="w-4 h-4 accent-[#D3755A]" />I confirm this is unconditional with no expectation of repayment</label>
        </div>
      )}

      {/* Chain section */}
      {scenarios.includes('chain') && (
        <div className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Chain (selling your current property)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Estate agent</label><input value={chain.estate_agent_name} onChange={e => setChain(c => ({...c, estate_agent_name: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Agent contact name</label><input value={chain.agent_contact} onChange={e => setChain(c => ({...c, agent_contact: e.target.value}))} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Phone</label><input type="tel" value={chain.phone} onChange={e => setChain(c => ({...c, phone: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Email</label><input type="email" value={chain.email} onChange={e => setChain(c => ({...c, email: e.target.value}))} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Address of sale</label><input value={chain.sale_address} onChange={e => setChain(c => ({...c, sale_address: e.target.value}))} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Agreed sale date</label><input type="date" value={chain.agreed_sale_date} onChange={e => setChain(c => ({...c, agreed_sale_date: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Agreed price (£)</label><input type="number" min="0" value={chain.agreed_price} onChange={e => setChain(c => ({...c, agreed_price: e.target.value}))} className={inputClass} /></div>
          </div>
          <div>
            <label className={labelClass}>Position of purchaser</label>
            <select value={chain.position} onChange={e => setChain(c => ({...c, position: e.target.value}))} className={inputClass}>
              <option value="">Select</option><option value="no_chain">No chain</option><option value="first_time_buyer">First-time buyer</option><option value="buyer_of_chain">Bottom of the chain</option><option value="in_chain">In a chain</option>
            </select>
          </div>
        </div>
      )}

      {/* Remortgage section */}
      {scenarios.includes('remortgage') && (
        <div className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Remortgage</h2>
          <label className="flex items-center gap-2 text-sm text-[#3D3A38]"><input type="checkbox" checked={remortgage.funds_arranged} onChange={e => setRemortgage(r => ({...r, funds_arranged: e.target.checked}))} className="w-4 h-4 accent-[#D3755A]" />Remortgage funds arranged</label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Broker firm</label><input value={remortgage.broker_firm} onChange={e => setRemortgage(r => ({...r, broker_firm: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Broker name</label><input value={remortgage.broker_name} onChange={e => setRemortgage(r => ({...r, broker_name: e.target.value}))} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Broker phone</label><input type="tel" value={remortgage.broker_phone} onChange={e => setRemortgage(r => ({...r, broker_phone: e.target.value}))} className={inputClass} /></div>
            <div><label className={labelClass}>Broker email</label><input type="email" value={remortgage.broker_email} onChange={e => setRemortgage(r => ({...r, broker_email: e.target.value}))} className={inputClass} /></div>
          </div>
        </div>
      )}

      {/* Consent */}
      <div className="bg-[#F5EBE0] rounded-xl p-4">
        <label className="flex items-start gap-3 text-sm text-[#1B2E4B] cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="w-4 h-4 accent-[#D3755A] mt-0.5" />
          <span>I grant consent for the above information to be shared with the owner of the property.</span>
        </label>
      </div>

      <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl text-white text-sm font-medium mt-2 disabled:opacity-50 transition-opacity hover:opacity-90" style={{background:'#1B2E4B'}}>
        {submitting ? 'Submitting…' : 'Submit offer'}
      </button>
    </form>
  )
}
