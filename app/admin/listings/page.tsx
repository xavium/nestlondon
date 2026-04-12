import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminListingsClient from './AdminListingsClient'

export default async function AdminListingsPage({
  searchParams
}: {
  searchParams: Promise<{key?: string}>
}) {
  const sp = await searchParams
  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'nestlondon-admin-2026'

  if (sp.key !== ADMIN_KEY) {
    redirect(`/admin/listings?key=${ADMIN_KEY}`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )

  const { data: pending } = await supabase
    .from('listings')
    .select('id,address,price,bedrooms,property_type,source,listed_at,description,images,raw_data,is_active')
    .eq('is_active', false)
    .order('listed_at', { ascending: false })
    .limit(50)

  const { data: recent } = await supabase
    .from('listings')
    .select('id,address,price,bedrooms,property_type,source,listed_at,is_active,raw_data')
    .in('source', ['Private owner', 'Landlord'])
    .eq('is_active', true)
    .order('listed_at', { ascending: false })
    .limit(20)

  const { data: deactivated } = await supabase
    .from('listings')
    .select('id,address,price,bedrooms,property_type,source,listed_at,is_active,raw_data')
    .in('source', ['Private owner', 'Landlord'])
    .eq('is_active', false)
    .not('id', 'in', `(${(pending || []).map((p: any) => p.id).join(',') || 'null'})`)
    .order('listed_at', { ascending: false })
    .limit(20)

  return <AdminListingsClient
    pending={pending || []}
    approved={recent || []}
    deactivated={deactivated || []}
    adminKey={ADMIN_KEY}
  />
}
