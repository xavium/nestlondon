import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { stripe, siteUrl } from '@/lib/billing/stripe'
import { getPlan, type Cadence } from '@/lib/billing/plans'

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan_code, cadence } = await req.json() as { plan_code?: string; cadence?: Cadence }
    if (!plan_code || (cadence !== 'monthly' && cadence !== 'annual')) {
      return NextResponse.json({ error: 'Missing plan_code or cadence' }, { status: 400 })
    }

    const plan = getPlan(plan_code)
    if (!plan) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })

    const priceId = cadence === 'monthly' ? plan.stripeMonthlyPriceId : plan.stripeAnnualPriceId
    if (!priceId) return NextResponse.json({ error: 'Plan price not configured' }, { status: 500 })

    // Reuse the Stripe customer ID across subscriptions for this user.
    const sb = svc()
    const { data: existing } = await sb
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/billing?canceled=1`,
      // Pass plan info through to the webhook so we can persist it.
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan_code, cadence },
      },
      metadata: { supabase_user_id: user.id, plan_code, cadence },
      // VAT-inclusive: tax is included in the price, no separate line.
      // Set automatic_tax to false explicitly.
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[BILLING checkout]', e.message)
    return NextResponse.json({ error: e.message || 'Checkout failed' }, { status: 500 })
  }
}
