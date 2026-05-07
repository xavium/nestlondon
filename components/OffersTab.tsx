'use client'

import { useState, useEffect } from 'react'

export interface Offer {
  id: string
  listing_id: string
  offer_type: 'rent' | 'buy'
  offerer_name: string
  offerer_email: string
  offerer_phone: string
  offer_amount: number
  status: string
  status_reason?: string | null
  created_at: string

  // Lettings
  tenants?: any[] | null
  combined_salary?: number | null
  furnished_preference?: string | null
  special_requirements?: string | null
  guarantor_details?: any | null
  guarantor_available?: boolean | null
  num_tenants?: number | null
  term_length_months?: number | null
  move_in_date?: string | null
  has_pets?: boolean | null
  pet_details?: string | null
  deposit_amount?: number | null
  employment_status?: string | null

  // Sales
  home_phone?: string | null
  rental_contract_notice?: string | null
  anticipated_exchange_date?: string | null
  anticipated_completion_date?: string | null
  special_terms?: string | null
  solicitor?: any | null
  funding_scenarios?: string[] | null
  mortgage_details?: any | null
  gifting?: any | null
  chain?: any | null
  remortgage?: any | null
  consent_to_share?: boolean | null

  notes?: string | null
}

export interface OfferListing {
  id: string
  address: string
  price: number | null
  listing_type: string | null
  bedrooms?: number | null
  property_type?: string | null
  image_urls?: string[] | null
}

interface Props {
  offers: Offer[]
  listings: OfferListing[]
  onStatusChange?: (offerId: string, newStatus: string, opts?: { reason?: string; note?: string }) => Promise<void>
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  new: { label: 'New', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  viewed: { label: 'Viewed', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
  accepted: { label: 'Accepted', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-stone-100', text: 'text-stone-500', border: 'border-stone-200' },
}

function formatDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMoney(n: number | null | undefined, suffix = '') {
  if (n == null) return '—'
  return '£' + n.toLocaleString() + suffix
}

export default function OffersTab({ offers: initialOffers, listings, onStatusChange }: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'accepted' | 'rejected'>('all')
  const [updating, setUpdating] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState<string>('too_low')
  const [rejectNote, setRejectNote] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [messageBody, setMessageBody] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSent, setMessageSent] = useState(false)

  useEffect(() => { setOffers(initialOffers) }, [initialOffers])
  useEffect(() => { setShowMessage(false); setMessageBody(''); setMessageSent(false); setShowRejectForm(false); setRejectReason('too_low'); setRejectNote('') }, [selectedId])

  const listingsById = listings.reduce<Record<string, OfferListing>>((m, l) => { m[l.id] = l; return m }, {})

  const filtered = offers.filter(o => {
    if (filter === 'all') return true
    if (filter === 'new') return o.status === 'new' || o.status === 'viewed'
    return o.status === filter
  })

  const selected = selectedId ? offers.find(o => o.id === selectedId) : null
  const selectedListing = selected ? listingsById[selected.listing_id] : null

  const REJECT_REASON_LABELS: Record<string, string> = {
    too_low: 'Offer was too low',
    already_accepted_other: 'Another offer was already accepted',
    unsuitable_terms: 'Terms were unsuitable',
    other: 'Other',
  }

  async function updateStatus(newStatus: string, opts?: { reason?: string; note?: string }) {
    if (!selected) return
    setUpdating(true)
    try {
      await onStatusChange?.(selected.id, newStatus, opts)
      const optimisticReason = newStatus === 'rejected' && opts?.reason
        ? [REJECT_REASON_LABELS[opts.reason], opts.note?.trim()].filter(Boolean).join(' — ')
        : null
      setOffers(os => os.map(o => o.id === selected.id ? { ...o, status: newStatus, status_reason: optimisticReason } : o))
      // Auto-prompt owner to message applicant after accepting/rejecting
      if (newStatus === 'accepted' || newStatus === 'rejected') {
        setShowRejectForm(false)
        setShowMessage(true)
        if (!messageBody) {
          setMessageBody(newStatus === 'accepted'
            ? 'Hi ' + (selected.offerer_name || 'there') + ', I\'m delighted to accept your offer. Let me know how you\'d like to proceed.'
            : 'Hi ' + (selected.offerer_name || 'there') + ', thank you for your offer. Unfortunately we won\'t be moving forward at this time.')
        }
      }
    } finally {
      setUpdating(false)
    }
  }

  async function sendMessage() {
    if (!selected || !messageBody.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: selected.listing_id,
          body: messageBody.trim(),
          to_email: selected.offerer_email,
        }),
      })
      if (res.ok) {
        setMessageSent(true)
        setTimeout(() => { setShowMessage(false); setMessageSent(false); setMessageBody('') }, 1800)
      }
    } finally {
      setSendingMessage(false)
    }
  }

  if (offers.length === 0) {
    return (
      <div className="bg-white border border-[#E8E2DA] rounded-2xl p-12 text-center">
        <div className="text-3xl mb-2">📨</div>
        <h3 className="text-lg font-light text-[#1B2E4B] mb-2" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>No offers yet</h3>
        <p className="text-sm text-[#9B928E]">When someone submits an offer on one of your listings, it'll show up here.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'all', label: `All (${offers.length})` },
          { key: 'new', label: `New (${offers.filter(o => o.status === 'new' || o.status === 'viewed').length})` },
          { key: 'accepted', label: `Accepted (${offers.filter(o => o.status === 'accepted').length})` },
          { key: 'rejected', label: `Rejected (${offers.filter(o => o.status === 'rejected').length})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' + (filter === f.key ? 'text-white border-transparent' : 'border-[#E8E2DA] text-[#3D3A38] hover:border-[#D3755A]')}
            style={filter === f.key ? {background:'#1B2E4B'} : {}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FCFAF7] border-b border-[#E8E2DA]">
            <tr className="text-left text-xs font-semibold text-[#9B928E] uppercase tracking-wide">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const l = listingsById[o.listing_id]
              const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.new
              const suffix = o.offer_type === 'rent' ? '/mo' : ''
              return (
                <tr key={o.id} onClick={() => setSelectedId(o.id)}
                  className={'cursor-pointer border-b border-[#F5F0EB] hover:bg-[#FCFAF7] transition-colors ' + (selectedId === o.id ? 'bg-[#FCFAF7]' : '')}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1B2E4B] truncate max-w-xs">{l?.address || 'Unknown'}</div>
                    {l && <div className="text-xs text-[#9B928E]">Listed at {formatMoney(l.price, o.offer_type === 'rent' ? '/mo' : '')}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#1B2E4B]">{o.offerer_name}</div>
                    <div className="text-xs text-[#9B928E]">{o.offerer_email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1B2E4B]">{formatMoney(o.offer_amount, suffix)}</td>
                  <td className="px-4 py-3 text-[#9B928E]">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full border ' + cfg.bg + ' ' + cfg.text + ' ' + cfg.border}>{cfg.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Side panel */}
      {selected && (
        <>
          <div onClick={() => setSelectedId(null)} className="fixed inset-0 bg-black/30 z-40" />
          <aside className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#E8E2DA] px-5 py-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{color:'#D3755A'}}>
                  {selected.offer_type === 'buy' ? 'Sales offer' : 'Rental offer'}
                </p>
                <h2 className="text-lg font-light text-[#1B2E4B] truncate" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
                  {selectedListing?.address || 'Listing'}
                </h2>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-[#9B928E] hover:text-[#1B2E4B] text-xl ml-3">×</button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Headline */}
              <div className="bg-[#F5EBE0] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9B928E] uppercase tracking-wide">Offer amount</p>
                  <p className="text-2xl font-light text-[#1B2E4B]" style={{fontFamily:'var(--font-serif),Georgia,serif'}}>
                    {formatMoney(selected.offer_amount, selected.offer_type === 'rent' ? '/mo' : '')}
                  </p>
                </div>
                {selectedListing && (
                  <div className="text-right">
                    <p className="text-xs text-[#9B928E]">Asking</p>
                    <p className="text-sm text-[#3D3A38]">{formatMoney(selectedListing.price, selected.offer_type === 'rent' ? '/mo' : '')}</p>
                  </div>
                )}
              </div>

              {/* Status actions */}
              <div className="flex gap-2">
                {selected.status !== 'accepted' && (
                  <button onClick={() => updateStatus('accepted')} disabled={updating}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                    Mark as accepted
                  </button>
                )}
                {selected.status !== 'rejected' && (
                  <button onClick={() => setShowRejectForm(s => !s)} disabled={updating}
                    className="flex-1 px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] text-sm font-medium hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                )}
                {(selected.status === 'accepted' || selected.status === 'rejected') && (
                  <button onClick={() => updateStatus('viewed')} disabled={updating}
                    className="flex-1 px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] text-sm hover:border-[#D3755A] transition-colors disabled:opacity-50">
                    Reset to viewed
                  </button>
                )}
              </div>

              {showRejectForm && selected.status !== 'rejected' && (
                <div className="bg-[#FEF6F4] border border-[#F0D5CC] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-3">Reason for rejecting</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {Object.entries(REJECT_REASON_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="reject_reason" value={key} checked={rejectReason === key} onChange={e => setRejectReason(e.target.value)} className="accent-[#D3755A]" />
                        <span className="text-[#3D3A38]">{label}</span>
                      </label>
                    ))}
                  </div>
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                    placeholder="Optional note (visible to the offerer in their email)"
                    className="w-full text-sm border border-[#E8E2DA] rounded-lg px-3 py-2 outline-none focus:border-[#D3755A] resize-none mb-3 bg-white" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRejectForm(false)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2DA] text-xs text-[#3D3A38]">Cancel</button>
                    <button onClick={() => updateStatus('rejected', { reason: rejectReason, note: rejectNote })} disabled={updating}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                      {updating ? 'Rejecting…' : 'Confirm rejection'}
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'rejected' && selected.status_reason && (
                <div className="bg-[#FEF6F4] border border-[#F0D5CC] rounded-xl p-3 text-sm">
                  <span className="text-xs text-[#9B928E] uppercase tracking-wide">Decline reason</span>
                  <div className="text-[#3D3A38] mt-0.5">{selected.status_reason}</div>
                </div>
              )}

              {!showMessage && (
                <button onClick={() => setShowMessage(true)}
                  className="w-full px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] text-sm hover:border-[#D3755A] transition-colors flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Message applicant
                </button>
              )}

              {showMessage && (
                <div className="bg-[#FCFAF7] border border-[#E8E2DA] rounded-xl p-4">
                  {messageSent ? (
                    <div className="text-sm text-green-700 text-center py-3">✓ Message sent to {selected.offerer_name}</div>
                  ) : (
                    <>
                      <p className="text-xs text-[#9B928E] mb-2">Message to {selected.offerer_name}</p>
                      <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows={4}
                        className="w-full text-sm border border-[#E8E2DA] rounded-lg px-3 py-2 outline-none focus:border-[#D3755A] resize-none mb-3 bg-white"
                        placeholder="Type your message…" />
                      <div className="flex gap-2">
                        <button onClick={() => { setShowMessage(false); setMessageBody('') }}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2DA] text-xs text-[#3D3A38]">Cancel</button>
                        <button onClick={sendMessage} disabled={sendingMessage || !messageBody.trim()}
                          className="flex-1 px-3 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-50"
                          style={{background:'#1B2E4B'}}>
                          {sendingMessage ? 'Sending…' : 'Send →'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Contact */}
              <Section title="Offerer">
                <DetailRow label="Name" value={selected.offerer_name} />
                <DetailRow label="Email" value={selected.offerer_email} />
                <DetailRow label="Phone" value={selected.offerer_phone} />
                {selected.home_phone && <DetailRow label="Home phone" value={selected.home_phone} />}
                <DetailRow label="Submitted" value={formatDate(selected.created_at)} />
              </Section>

              {/* Lettings details */}
              {selected.offer_type === 'rent' && (
                <>
                  <Section title="Tenancy">
                    {selected.term_length_months && <DetailRow label="Term" value={`${selected.term_length_months} months`} />}
                    {selected.move_in_date && <DetailRow label="Move-in date" value={formatDate(selected.move_in_date)} />}
                    {selected.furnished_preference && <DetailRow label="Furnished" value={selected.furnished_preference} />}
                    {selected.combined_salary && <DetailRow label="Combined salary" value={formatMoney(selected.combined_salary)} />}
                    {selected.deposit_amount && <DetailRow label="Deposit offered" value={formatMoney(selected.deposit_amount)} />}
                    {selected.has_pets && <DetailRow label="Pets" value={selected.pet_details || 'Yes'} />}
                    {selected.special_requirements && <DetailRow label="Special requirements" value={selected.special_requirements} />}
                  </Section>

                  {selected.tenants && selected.tenants.length > 0 && (
                    <Section title={`Tenants (${selected.tenants.length})`}>
                      {selected.tenants.map((t: any, i: number) => (
                        <div key={i} className="bg-[#FCFAF7] rounded-xl p-3 mb-2 last:mb-0 text-sm">
                          <div className="font-medium text-[#1B2E4B] mb-1">{t.name || `Tenant ${i+1}`}</div>
                          {t.email && <div className="text-xs text-[#9B928E]">{t.email}</div>}
                          {t.phone && <div className="text-xs text-[#9B928E]">{t.phone}</div>}
                          {t.occupation && <div className="text-xs text-[#3D3A38] mt-1">{t.occupation}{t.employer_name ? ` at ${t.employer_name}` : ''}</div>}
                          {t.salary && <div className="text-xs text-[#3D3A38]">Salary: {formatMoney(t.salary)}</div>}
                        </div>
                      ))}
                    </Section>
                  )}

                  {selected.guarantor_available && selected.guarantor_details && (
                    <Section title="Guarantor">
                      <DetailRow label="Name" value={selected.guarantor_details.name} />
                      <DetailRow label="Phone" value={selected.guarantor_details.phone} />
                      <DetailRow label="Email" value={selected.guarantor_details.email} />
                      <DetailRow label="Occupation" value={selected.guarantor_details.occupation} />
                      <DetailRow label="Salary" value={selected.guarantor_details.salary ? formatMoney(selected.guarantor_details.salary) : null} />
                      <DetailRow label="Based in" value={selected.guarantor_details.based_in === 'uk' ? 'UK' : selected.guarantor_details.based_in === 'abroad' ? 'Abroad' : null} />
                    </Section>
                  )}
                </>
              )}

              {/* Sales details */}
              {selected.offer_type === 'buy' && (
                <>
                  <Section title="Purchase details">
                    {selected.anticipated_exchange_date && <DetailRow label="Anticipated exchange" value={formatDate(selected.anticipated_exchange_date)} />}
                    {selected.anticipated_completion_date && <DetailRow label="Anticipated completion" value={formatDate(selected.anticipated_completion_date)} />}
                    {selected.rental_contract_notice && <DetailRow label="Current rental notice" value={selected.rental_contract_notice} />}
                    {selected.has_pets && <DetailRow label="Pets" value={selected.pet_details || 'Yes'} />}
                    {selected.special_terms && <DetailRow label="Special terms" value={selected.special_terms} />}
                    {selected.funding_scenarios && selected.funding_scenarios.length > 0 && (
                      <DetailRow label="Funding" value={selected.funding_scenarios.join(', ')} />
                    )}
                  </Section>

                  {selected.solicitor && (selected.solicitor.firm_name_address || selected.solicitor.fee_earner) && (
                    <Section title="Solicitor">
                      <DetailRow label="Firm" value={selected.solicitor.firm_name_address} />
                      <DetailRow label="Fee earner" value={selected.solicitor.fee_earner} />
                      <DetailRow label="Phone" value={selected.solicitor.phone} />
                      <DetailRow label="Email" value={selected.solicitor.email} />
                    </Section>
                  )}

                  {selected.mortgage_details && (
                    <Section title="Mortgage">
                      <DetailRow label="Amount" value={selected.mortgage_details.amount ? formatMoney(selected.mortgage_details.amount) : null} />
                      <DetailRow label="Lender" value={selected.mortgage_details.lender} />
                      <DetailRow label="Agreement in principle" value={selected.mortgage_details.in_principle ? 'Yes' : null} />
                      <DetailRow label="Proof of deposit" value={selected.mortgage_details.proof_of_deposit_confirmed ? 'Confirmed' : null} />
                      <DetailRow label="Broker" value={[selected.mortgage_details.broker_firm, selected.mortgage_details.broker_name].filter(Boolean).join(' — ')} />
                      <DetailRow label="Broker contact" value={[selected.mortgage_details.broker_phone, selected.mortgage_details.broker_email].filter(Boolean).join(' / ')} />
                    </Section>
                  )}

                  {selected.gifting && selected.gifting.gifter_name && (
                    <Section title="Gift">
                      <DetailRow label="Gifter" value={selected.gifting.gifter_name} />
                      <DetailRow label="Amount" value={selected.gifting.amount ? formatMoney(selected.gifting.amount) : null} />
                      <DetailRow label="Source" value={selected.gifting.source} />
                      <DetailRow label="Relationship" value={selected.gifting.relationship} />
                      <DetailRow label="Unconditional" value={selected.gifting.unconditional_confirmed ? 'Confirmed' : null} />
                    </Section>
                  )}

                  {selected.chain && selected.chain.estate_agent_name && (
                    <Section title="Chain">
                      <DetailRow label="Estate agent" value={selected.chain.estate_agent_name} />
                      <DetailRow label="Agent contact" value={selected.chain.agent_contact} />
                      <DetailRow label="Phone" value={selected.chain.phone} />
                      <DetailRow label="Email" value={selected.chain.email} />
                      <DetailRow label="Sale address" value={selected.chain.sale_address} />
                      <DetailRow label="Agreed sale date" value={selected.chain.agreed_sale_date ? formatDate(selected.chain.agreed_sale_date) : null} />
                      <DetailRow label="Agreed price" value={selected.chain.agreed_price ? formatMoney(selected.chain.agreed_price) : null} />
                      <DetailRow label="Position" value={selected.chain.position} />
                    </Section>
                  )}

                  {selected.remortgage && selected.remortgage.funds_arranged && (
                    <Section title="Remortgage">
                      <DetailRow label="Funds arranged" value="Yes" />
                      <DetailRow label="Broker" value={[selected.remortgage.broker_firm, selected.remortgage.broker_name].filter(Boolean).join(' — ')} />
                      <DetailRow label="Broker contact" value={[selected.remortgage.broker_phone, selected.remortgage.broker_email].filter(Boolean).join(' / ')} />
                    </Section>
                  )}

                  {selected.consent_to_share && (
                    <p className="text-xs text-[#9B928E] italic">✓ Offerer has granted consent to share this information.</p>
                  )}
                </>
              )}

              {selected.notes && (
                <Section title="Notes">
                  <p className="text-sm text-[#3D3A38] whitespace-pre-wrap">{selected.notes}</p>
                </Section>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[#9B928E] flex-shrink-0">{label}</span>
      <span className="text-[#1B2E4B] text-right break-words">{value}</span>
    </div>
  )
}
