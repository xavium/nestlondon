import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/billing/stripe'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  // Stripe needs the raw body to verify the signature. Next.js 16 + Turbopack
  // can corrupt the body if we use req.text() (line-ending normalisation), so
  // read as ArrayBuffer and pass the Buffer directly.
  const buf = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(buf, sig, secret)
  } catch (e: any) {
    console.error('[STRIPE webhook] Bad signature:', e.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sb = svc()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // First payment success. Don't create the subscription row yet —
        // we'll get a subscription.created event for that. But cache the
        // plan_code from session metadata onto the subscription.
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription && session.metadata?.supabase_user_id) {
          // No-op here; subscription.created will handle row creation.
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = (sub.metadata as any)?.supabase_user_id
        const planCode = (sub.metadata as any)?.plan_code
        const cadence = (sub.metadata as any)?.cadence
        if (!userId || !planCode || !cadence) {
          console.warn('[STRIPE webhook] Subscription event without metadata, skipping', sub.id)
          break
        }

        const item = sub.items.data[0]
        const periodStart = item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null

        // Upsert by stripe_subscription_id
        const { data: existing } = await sb
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()

        const row = {
          user_id: userId,
          plan_code: planCode,
          cadence,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          stripe_subscription_id: sub.id,
          stripe_price_id: item?.price.id,
          status: sub.status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        }
        if (existing) {
          await sb.from('subscriptions').update(row).eq('id', existing.id)
        } else {
          await sb.from('subscriptions').insert(row)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await sb.from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      default:
        // Unhandled event types are fine; Stripe sends a lot we don't care about.
        break
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[STRIPE webhook] Handler error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
