/**
 * Admin-role helpers. Matches the existing pattern in app/listings/[id]/page.tsx,
 * where admin status is read from Supabase user metadata.
 *
 * To make a user an admin, run this SQL once in Supabase:
 *   UPDATE auth.users
 *   SET raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
 *   WHERE email = 'your@email.com';
 *
 * After updating, the user must sign out and back in for the new JWT to reflect it.
 */
import type { User } from '@supabase/supabase-js'

/** Returns true if the given user has admin role in their metadata. */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  return user.user_metadata?.role === 'admin'
}
