import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/billing/stripe'
import { getPlan, type PlanCode, type Cadence } from '@/lib/billing/plans'
import { getActiveSubscription } from '@/lib/billing/access'

export async function POST(req: NextRequest) {
  try {
    const { plan_code, cadence } = await req.json() as { plan_code: PlanCode, cadence: Cadence }
    if (!plan_code || !cadence) {
      return NextResponse.json({ error: 'plan_code and cadence required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sub = await getActiveSubscription(user.id)
    if (!sub) return NextResponse.json({ error: 'No active subscription to upgrade' }, { status: 400 })
    if (sub.comp_code_id) {
      return NextResponse.json({ error: 'Complimentary subscriptions cannot be upgraded online. Please contact support.' }, { status: 400 })
    }

    const plan = getPlan(plan_code)
    if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    const newPriceId = cadence === 'annual' ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId
    if (!newPriceId) return NextResponse.json({ error: 'Plan price not configured' }, { status: 500 })

    const { createClient } = await import('@supabase/supabase-js')
    const sb2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: subRow } = await sb2.from('subscriptions').select('stripe_subscription_id').eq('id', sub.id).single()
    if (!subRow?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Subscription not linked to Stripe' }, { status: 400 })
    }

    const stripeSub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id)
    const currentItem = stripeSub.items.data[0]
    if (!currentItem) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 500 })
    }
    if (currentItem.price.id === newPriceId) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 })
    }

    await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: 'always_invoice',
      metadata: {
        supabase_user_id: user.id,
        plan_code,
        cadence,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[upgrade] error:', e)
    return NextResponse.json({ error: e.message || 'Upgrade failed' }, { status: 500 })
  }
}
