import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/billing/stripe'
import { getActiveSubscription } from '@/lib/billing/access'

export async function POST(req: NextRequest) {
  try {
    const { resume } = (await req.json().catch(() => ({}))) as { resume?: boolean }

    const cookieStore = await cookies()
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sub = await getActiveSubscription(user.id)
    if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    if (sub.comp_code_id) {
      return NextResponse.json({ error: 'Complimentary subscriptions cannot be cancelled here. Please contact support.' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const sb2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: subRow } = await sb2.from('subscriptions').select('stripe_subscription_id').eq('id', sub.id).single()
    if (!subRow?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Subscription not linked to Stripe' }, { status: 400 })
    }

    // cancel_at_period_end keeps the user on their plan until the end of the
    // current billing period; resume = false flips it back on.
    await stripe.subscriptions.update(subRow.stripe_subscription_id, {
      cancel_at_period_end: !resume,
    })

    return NextResponse.json({ ok: true, cancel_at_period_end: !resume })
  } catch (e: any) {
    console.error('[cancel] error:', e)
    return NextResponse.json({ error: e.message || 'Cancel failed' }, { status: 500 })
  }
}
