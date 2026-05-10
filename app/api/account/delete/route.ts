import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )

    await adminClient.from('saved_properties').delete().eq('user_id', user.id)
    await adminClient.from('saved_searches').delete().eq('user_id', user.id)
    await adminClient.from('viewing_requests').delete().eq('tenant_email', user.email)

    // Deactivate any live direct listings owned by this user (by agent_id or
    // raw_data.contact.email) before deleting the auth record.
    const emailLc = user.email?.toLowerCase() || null
    const ids = new Set<string>()
    const { data: byAgent } = await adminClient
      .from('listings')
      .select('id')
      .eq('agent_id', user.id)
      .eq('is_direct', true)
      .eq('status', 'live')
    ;(byAgent || []).forEach(l => ids.add(l.id))
    if (emailLc) {
      const { data: byEmail } = await adminClient
        .from('listings')
        .select('id')
        .eq('is_direct', true)
        .eq('status', 'live')
        .filter('raw_data->contact->>email', 'eq', emailLc)
      ;(byEmail || []).forEach(l => ids.add(l.id))
    }
    if (ids.size > 0) {
      await adminClient
        .from('listings')
        .update({ status: 'deactivated', is_active: false })
        .in('id', Array.from(ids))
    }

    // Cancel any active Stripe subscription so we don't keep billing a deleted account.
    // Best-effort: if it fails (e.g. Stripe unreachable), proceed with deletion.
    const { data: subs } = await adminClient
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
    if (subs && subs.length > 0) {
      try {
        const { stripe } = await import('@/lib/billing/stripe')
        for (const s of subs) {
          if (s.stripe_subscription_id) {
            await stripe.subscriptions.cancel(s.stripe_subscription_id).catch(e => console.warn('Stripe cancel failed:', e?.message))
          }
        }
      } catch (e: any) {
        console.warn('Stripe cancel block failed:', e?.message)
      }
    }

    await adminClient.auth.admin.deleteUser(user.id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
