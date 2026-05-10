import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import BillingClient from './BillingClient'
import { PLANS, type PlanCode } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string; from?: string; at_cap?: string }> }) {
  const sp = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/billing')

  const role = (user.user_metadata?.role as string | undefined) || ''
  const isAgent = role === 'agent' || role === 'agent_lettings' || role === 'agent_sales'
  const isOwner = role === 'owner' || role === 'owner_lettings' || role === 'owner_sales' || role === 'landlord'
  // Tenants and other non-paying roles get redirected; only agents/owners see the page.
  if (!isAgent && !isOwner) redirect('/')
  const audienceHint: 'agent' | 'owner' = isAgent ? 'agent' : 'owner'

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Active subscription (if any)
  const { data: activeSub } = await svc
    .from('subscriptions')
    .select('id, plan_code, cadence, status, current_period_end, cancel_at_period_end, comp_code_id, stripe_customer_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due', 'comped'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton variant="dark" />
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>Billing</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Subscription</h1>
        </div>

        {sp.success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 text-green-900 p-4 text-sm">
            Payment successful. Your subscription should appear within a few seconds.
          </div>
        )}
        {sp.canceled && (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 text-stone-700 p-4 text-sm">
            Checkout canceled. You can pick a plan again whenever you're ready.
          </div>
        )}
        {sp.from === 'list' && !activeSub && (
          <div className="mb-6 rounded-2xl border border-[#C9D6E5] bg-[#EFF4F9] p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#1B2E4B20' }}>
                <svg className="w-4 h-4" fill="none" stroke="#1B2E4B" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1B2E4B]">You need a subscription to publish listings</p>
                <p className="text-xs text-[#6B645F] mt-1">Pick a plan below to get started, or redeem a discount code if you have one.</p>
              </div>
            </div>
          </div>
        )}
        {sp.at_cap && activeSub && (
          <div className="mb-6 rounded-2xl border border-[#E8C9B0] bg-[#FCF5EE] p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#D3755A20' }}>
                <svg className="w-4 h-4" fill="none" stroke="#D3755A" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#1B2E4B]">You've reached your listing limit</p>
                <p className="text-xs text-[#6B645F] mt-1 leading-relaxed">
                  Your current plan ({PLANS[activeSub.plan_code as PlanCode]?.name ?? activeSub.plan_code}) caps you at{' '}
                  {PLANS[activeSub.plan_code as PlanCode]?.maxListings} {PLANS[activeSub.plan_code as PlanCode]?.maxListings === 1 ? 'listing' : 'listings'}.
                  Upgrade to a larger plan, or take down an existing listing to add a new one.
                </p>
              </div>
            </div>
          </div>
        )}

        <BillingClient
          atCap={!!sp.at_cap}
          activeSub={activeSub ? {
            id: activeSub.id,
            plan_code: activeSub.plan_code,
            cadence: activeSub.cadence,
            status: activeSub.status,
            current_period_end: activeSub.current_period_end,
            cancel_at_period_end: activeSub.cancel_at_period_end,
            is_comped: !!activeSub.comp_code_id,
            has_stripe_customer: !!activeSub.stripe_customer_id,
            plan_name: PLANS[activeSub.plan_code as PlanCode]?.name ?? activeSub.plan_code,
          } : null}
          audienceHint={audienceHint}
          plans={Object.values(PLANS).map(p => ({
            code: p.code,
            audience: p.audience,
            name: p.name,
            description: p.description,
            maxListings: p.maxListings,
            monthlyPence: p.monthlyPence,
            annualPence: p.annualPence,
          }))}
        />
      </div>
    </main>
  )
}
