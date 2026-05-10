import { createClient } from '@supabase/supabase-js'
import { getPlan } from './plans'
import { resolveAgency } from '../agency'

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AccessResult =
  | { allowed: true; reason: 'subscription' | 'comped'; plan_code: string; max_listings: number | null; current_count: number }
  | { allowed: false; reason: 'no_subscription' }
  | { allowed: false; reason: 'at_listing_cap'; plan_code: string; max_listings: number; current_count: number }

/**
 * Returns the user's current active subscription row (paid, trialing, past_due,
 * or comped) or null. "active" here means: counts for paywall purposes.
 */
export async function getActiveSubscription(userId: string) {
  const sb = svc()
  const { data } = await sb
    .from('subscriptions')
    .select('id, plan_code, cadence, status, current_period_end, comp_code_id')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due', 'comped'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Counts direct (non-scraped) listings that count toward this user's plan cap.
 * Includes pending-approval drafts (is_active=false) so users can't rack up
 * unlimited drafts.
 *
 * Two paths:
 * - Agents: cap is shared across the whole agency. Count all listings under
 *   the agency's agent_id (regardless of which member created them).
 * - Owners: count listings linked either by agent_id=user.id (new direct path)
 *   or by raw_data.contact.email matching the user's email (legacy path used
 *   by the owner dashboard).
 */
export async function countActiveListings(userId: string, userEmail?: string | null, audience: 'agent' | 'owner' = 'owner'): Promise<number> {
  const sb = svc()

  if (audience === 'agent') {
    const ctx = await resolveAgency(userId)
    const agencyId = ctx?.agencyId ?? userId
    const { count } = await sb
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agencyId)
      .eq('is_direct', true)
    return count ?? 0
  }

  // Owner path. Mirror the OR logic the owner dashboard uses to pick "your listings".
  const emailLc = (userEmail || '').toLowerCase()
  const { data: byAgentId } = await sb
    .from('listings')
    .select('id')
    .eq('agent_id', userId)
    .eq('is_direct', true)

  let byEmail: { id: string }[] = []
  if (emailLc) {
    const { data } = await sb
      .from('listings')
      .select('id')
      .eq('is_direct', true)
      .filter('raw_data->contact->>email', 'eq', emailLc)
    byEmail = data ?? []
  }

  // Dedupe (a listing might match both)
  const ids = new Set([...(byAgentId ?? []).map(l => l.id), ...byEmail.map(l => l.id)])
  return ids.size
}

/**
 * Checks whether the user can create a new listing right now.
 * Returns a discriminated union with the reason — callers decide whether to
 * redirect, show a banner, or 402.
 */
export async function canCreateListing(userId: string, userEmail?: string | null): Promise<AccessResult> {
  const sub = await getActiveSubscription(userId)
  if (!sub) return { allowed: false, reason: 'no_subscription' }

  const plan = getPlan(sub.plan_code)
  const maxListings = plan?.maxListings ?? null
  const audience: 'agent' | 'owner' = plan?.audience === 'agent' ? 'agent' : 'owner'
  const current = await countActiveListings(userId, userEmail, audience)

  if (maxListings != null && current >= maxListings) {
    return { allowed: false, reason: 'at_listing_cap', plan_code: sub.plan_code, max_listings: maxListings, current_count: current }
  }

  return {
    allowed: true,
    reason: sub.comp_code_id ? 'comped' : 'subscription',
    plan_code: sub.plan_code,
    max_listings: maxListings,
    current_count: current,
  }
}
