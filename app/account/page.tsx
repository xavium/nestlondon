import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/account')

  // Profile is stored in auth user metadata — no separate users table
  const profile = {
    name: user.user_metadata?.name || '',
    phone: user.user_metadata?.phone || '',
    role: user.user_metadata?.role || 'resident',
    created_at: user.created_at || '',
  }

  const { data: savedProperties } = await supabase
    .from('saved_properties')
    .select('id, created_at, listing_id, listings(id, address, price, bedrooms, bathrooms, property_type, borough, images, is_active)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: savedSearches } = await supabase
    .from('saved_searches')
    .select('id, name, params, created_at, alerts_enabled')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const role = user.user_metadata?.role || 'resident'
  const validTabs = ['profile', 'account'] as const
  type Tab = typeof validTabs[number]
  const defaultTab: Tab = (role === 'resident' || role === 'tenant' || !role || role === 'user') ? 'profile' : 'account'
  const initialTab: Tab = validTabs.includes(sp.tab as Tab) ? (sp.tab as Tab) : defaultTab

  return (
    <AccountClient
      user={{
        id: user.id,
        email: user.email || '',
        name: profile?.name || '',
        phone: profile?.phone || '',
        created_at: profile?.created_at || user.created_at || '',
        role: role,
      }}
      savedProperties={(savedProperties || []) as any}
      savedSearches={(savedSearches || []).map(s => ({ ...s, alerts_enabled: s.alerts_enabled ?? false })) as any}
      initialTab={initialTab}
    />
  )
}
