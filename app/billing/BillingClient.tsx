'use client'

import { useState } from 'react'
import { formatPrice, type Cadence } from '@/lib/billing/plans'

interface PlanRow {
  code: string
  audience: 'agent' | 'owner'
  name: string
  description: string
  maxListings: number | null
  monthlyPence: number
  annualPence: number
}

interface ActiveSub {
  id: string
  plan_code: string
  plan_name: string
  cadence: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  is_comped: boolean
  has_stripe_customer: boolean
}

interface Props {
  activeSub: ActiveSub | null
  audienceHint: 'agent' | 'owner'
  plans: PlanRow[]
  atCap?: boolean
}

export default function BillingClient({ activeSub, audienceHint, plans, atCap }: Props) {
  const audience = audienceHint
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [showCompForm, setShowCompForm] = useState(false)
  const [compCode, setCompCode] = useState('')
  const [compMessage, setCompMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  // Sort plans by capacity (ascending) so the table reads small-to-large.
  const sortedAudiencePlans = plans.filter(p => p.audience === audience).sort((a, b) => {
    const aMax = a.maxListings ?? Infinity
    const bMax = b.maxListings ?? Infinity
    return aMax - bMax
  })
  // When at cap, only offer plans strictly larger than the current one.
  const currentMax = activeSub
    ? plans.find(p => p.code === activeSub.plan_code)?.maxListings ?? 0
    : 0
  const filteredPlans = atCap && activeSub
    ? sortedAudiencePlans.filter(p => (p.maxListings ?? Infinity) > (currentMax ?? 0))
    : sortedAudiencePlans

  async function startCheckout(planCode: string) {
    setLoadingPlan(planCode)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_code: planCode, cadence }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not start checkout')
    } finally {
      setLoadingPlan(null)
    }
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Could not open customer portal')
    } finally {
      setPortalLoading(false)
    }
  }

  async function redeem() {
    if (!compCode.trim()) return
    setRedeeming(true)
    setCompMessage(null)
    try {
      const res = await fetch('/api/billing/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: compCode.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setCompMessage({ kind: 'success', text: 'Code redeemed. Refreshing…' })
        setTimeout(() => window.location.reload(), 800)
      } else {
        setCompMessage({ kind: 'error', text: data.error || 'Could not redeem code' })
      }
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Active subscription card */}
      {activeSub && (
        <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-[#9B928E] uppercase tracking-wide mb-1">Current plan</p>
              <h2 className="text-2xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>
                {activeSub.plan_name}
              </h2>
              <p className="text-sm text-[#6B645F] mt-1">
                {activeSub.cadence === 'monthly' ? 'Monthly' : 'Annual'} ·{' '}
                {activeSub.is_comped ? 'Complimentary access' :
                  activeSub.status === 'active' ? 'Active' :
                  activeSub.status === 'trialing' ? 'Trialing' :
                  activeSub.status === 'past_due' ? 'Payment past due' : activeSub.status}
              </p>
              {activeSub.current_period_end && (
                <p className="text-xs text-[#9B928E] mt-2">
                  {activeSub.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                  {new Date(activeSub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            {activeSub.has_stripe_customer && (
              <button onClick={openPortal} disabled={portalLoading}
                className="px-4 py-2 rounded-xl border border-[#E8E2DA] text-[#3D3A38] text-sm hover:border-[#D3755A] disabled:opacity-50">
                {portalLoading ? 'Opening…' : 'Manage subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan picker */}
      {(!activeSub || (atCap && filteredPlans.length > 0)) && (
        <>
          <div>
            <h2 className="text-xl font-light text-[#1B2E4B] mb-2" style={{ fontFamily: 'Georgia,serif' }}>
              {atCap && activeSub ? 'Upgrade for more listings' : 'Pick a plan'}
            </h2>
            <p className="text-sm text-[#6B645F]">All prices include VAT. Cancel any time.</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="inline-flex bg-white border border-[#E8E2DA] rounded-full p-1 text-sm">
              <button onClick={() => setCadence('monthly')}
                className={'px-4 py-1.5 rounded-full transition ' + (cadence === 'monthly' ? 'bg-[#D3755A] text-white' : 'text-[#3D3A38]')}>
                Monthly
              </button>
              <button onClick={() => setCadence('annual')}
                className={'px-4 py-1.5 rounded-full transition ' + (cadence === 'annual' ? 'bg-[#D3755A] text-white' : 'text-[#3D3A38]')}>
                Annual <span className="text-xs opacity-80 ml-1">(save 20%)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredPlans.map(p => {
              const pence = cadence === 'monthly' ? p.monthlyPence : p.annualPence
              return (
                <div key={p.code} className="bg-white border border-[#E8E2DA] rounded-2xl p-6 flex flex-col gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>{p.name}</h3>
                    <p className="text-xs text-[#9B928E] mt-1">{p.description}</p>
                  </div>
                  <div className="py-2">
                    <span className="text-3xl font-light text-[#1B2E4B]">{formatPrice(pence)}</span>
                    <span className="text-xs text-[#9B928E] ml-1">/{cadence === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <ul className="text-sm text-[#3D3A38] flex flex-col gap-1.5 mb-2">
                    <li>✓ Up to {p.maxListings ?? 'unlimited'} active listings</li>
                    <li>✓ Full dashboard & analytics</li>
                    <li>✓ Viewing & offer management</li>
                  </ul>
                  <button onClick={() => atCap && activeSub ? openPortal() : startCheckout(p.code)} disabled={loadingPlan !== null || portalLoading}
                    className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#D3755A' }}>
                    {loadingPlan === p.code ? 'Redirecting…' : (atCap && activeSub ? 'Upgrade via Stripe Portal' : 'Subscribe')}
                  </button>
                </div>
              )
            })}
          </div>

          {atCap && activeSub && filteredPlans.length === 0 && (
            <p className="text-sm text-[#6B645F]">
              You're already on our largest plan. To list more properties, take down an existing one or get in touch about a custom plan.
            </p>
          )}

          {/* Comp code (only relevant on first signup, not for upgrades) */}
          {!activeSub && (
          <div className="bg-white border border-[#E8E2DA] rounded-2xl p-6">
            {!showCompForm ? (
              <button onClick={() => setShowCompForm(true)}
                className="text-sm text-[#D3755A] hover:underline">
                Have a discount code?
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#9B928E] uppercase tracking-wide mb-2">Discount code</p>
                  <p className="text-xs text-[#6B645F]">Enter a code to activate complimentary access without payment.</p>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={compCode} onChange={e => setCompCode(e.target.value)}
                    placeholder="EARLYBIRD"
                    className="flex-1 border border-[#E8E2DA] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D3755A] uppercase tracking-wider" />
                  <button onClick={redeem} disabled={redeeming || !compCode.trim()}
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: '#1B2E4B' }}>
                    {redeeming ? 'Redeeming…' : 'Redeem'}
                  </button>
                </div>
                {compMessage && (
                  <p className={'text-sm ' + (compMessage.kind === 'success' ? 'text-green-700' : 'text-red-600')}>
                    {compMessage.text}
                  </p>
                )}
              </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  )
}
