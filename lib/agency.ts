import { createClient } from '@supabase/supabase-js'

const svc = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AgencyContext {
  agencyId: string          // the original signup user id — used as agency_id on rows
  isAdmin: boolean
  isOwner: boolean          // owner = the original signup user
  memberRecord: any | null  // agency_agents row, null if user IS the owner
}

/**
 * Resolve the agency context for a logged-in auth user.
 * Returns null if the user has no agency association.
 *
 * Resolution order:
 * 1. If an agency_agents row has auth_user_id matching this user → they're an invited member.
 *    agencyId = that row's agency_id. isAdmin = that row's is_admin.
 * 2. Otherwise, if this user has any agency_agents rows they own (agency_id = user.id),
 *    treat them as the agency owner → isAdmin=true, isOwner=true, agencyId=user.id.
 * 3. Otherwise they might still be an agent who hasn't created a team yet.
 *    Treat user.id as their own agency_id, isAdmin=true, isOwner=true.
 */
export async function resolveAgency(userId: string): Promise<AgencyContext | null> {
  const sb = svc()

  // 1. Invited member?
  const { data: member } = await sb
    .from('agency_agents')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (member) {
    return {
      agencyId: member.agency_id,
      isAdmin: !!member.is_admin,
      isOwner: false,
      memberRecord: member,
    }
  }

  // 2/3. Otherwise, user IS the agency (owner).
  // Agency owners are implicitly admin over their own agency.
  return {
    agencyId: userId,
    isAdmin: true,
    isOwner: true,
    memberRecord: null,
  }
}
