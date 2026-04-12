import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/account')

  // Redirect owners/agents to their own dashboards
  const role = user.user_metadata?.role

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )

  // Fetch saved properties with listing details
  const { data: savedProps } = await adminClient
    .from('saved_properties')
    .select('id, created_at, listing_id, listings(id, address, price, bedrooms, bathrooms, property_type, borough, images, is_active)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch saved searches
  const { data: savedSearches } = await adminClient
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Normalise Supabase join (listings may come back as array or object)
  const normalisedProps = (savedProps || []).map((p: any) => ({
    ...p,
    listings: Array.isArray(p.listings) ? p.listings[0] || null : p.listings
  }))

  return (
    <AccountClient
      user={{
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        created_at: user.created_at,
        role: role || undefined,
      }}
      savedProperties={normalisedProps}
      savedSearches={savedSearches || []}
    />
  )
}
