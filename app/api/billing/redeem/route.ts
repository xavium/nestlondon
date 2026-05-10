import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getPlan } from '@/lib/billing/plans'

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

    const { code } = await req.json() as { code?: string }
    if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    const normalised = code.trim().toUpperCase()

    const sb = svc()

    // Look up the code
    const { data: comp } = await sb
      .from('comp_codes')
      .select('*')
      .eq('code', normalised)
      .maybeSingle()
    if (!comp) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })

    // Validity checks
    const now = new Date()
    if (comp.valid_from && new Date(comp.valid_from) > now) {
      return NextResponse.json({ error: 'Code is not yet active' }, { status: 400 })
    }
    if (comp.valid_until && new Date(comp.valid_until) < now) {
      return NextResponse.json({ error: 'Code has expired' }, { status: 400 })
    }
    if (comp.max_redemptions != null && comp.redemption_count >= comp.max_redemptions) {
      return NextResponse.json({ error: 'Code has been fully redeemed' }, { status: 400 })
    }

    // Plan must still exist in catalogue
    const plan = getPlan(comp.plan_code)
    if (!plan) return NextResponse.json({ error: 'Code references an unknown plan' }, { status: 500 })

    // Refuse if user already has an active subscription
    const { data: activeSub } = await sb
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due', 'comped'])
      .maybeSingle()
    if (activeSub) {
      return NextResponse.json({ error: 'You already have an active subscription' }, { status: 400 })
    }

    // Compute period end if duration is bounded
    const periodStart = now.toISOString()
    const periodEnd = comp.duration_months
      ? new Date(now.getTime() + comp.duration_months * 30 * 86400_000).toISOString()
      : null

    // Insert subscription as comped, increment the code redemption count atomically.
    const { error: insertErr } = await sb.from('subscriptions').insert({
      user_id: user.id,
      plan_code: comp.plan_code,
      cadence: comp.cadence,
      status: 'comped',
      comp_code_id: comp.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    })
    if (insertErr) throw insertErr

    await sb.from('comp_codes')
      .update({ redemption_count: comp.redemption_count + 1 })
      .eq('id', comp.id)

    return NextResponse.json({ ok: true, plan_code: comp.plan_code, cadence: comp.cadence })
  } catch (e: any) {
    console.error('[BILLING redeem]', e.message)
    return NextResponse.json({ error: e.message || 'Redemption failed' }, { status: 500 })
  }
}
