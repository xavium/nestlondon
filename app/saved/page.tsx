import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavAuthButton from '@/components/NavAuthButton'
import SavedFoldersClient from './SavedFoldersClient'

export const dynamic = 'force-dynamic'

export default async function SavedPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/saved')

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: folders } = await supabase
    .from('saved_property_folders')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const folderIds = (folders || []).map((f: any) => f.id)

  const { data: memberRows } = folderIds.length > 0
    ? await svc.from('saved_property_folder_members').select('folder_id, user_id, joined_via, last_visited_at').in('folder_id', folderIds)
    : { data: [] }

  // Capture this user's previous last_visited_at per folder BEFORE we update it.
  // We use this to flag "new" properties on the client (anything saved_at > previous last_visited_at).
  const previousVisits = new Map<string, string | null>()
  ;(memberRows || []).forEach((m: any) => {
    if (m.user_id === user.id) previousVisits.set(m.folder_id, m.last_visited_at)
  })

  // Update this user's last_visited_at for all their folder memberships
  if (folderIds.length > 0) {
    await svc.from('saved_property_folder_members')
      .update({ last_visited_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('folder_id', folderIds)
  }

  const { data: usersData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const usersById = new Map<string, { email?: string; name?: string }>(
    (usersData as any).users.map((u: any) => [u.id, { email: u.email, name: u.user_metadata?.name as string | undefined }])
  )

  const { data: foldered } = folderIds.length > 0
    ? await svc.from('saved_properties')
        .select('id, created_at, listing_id, folder_id, user_id, listings(id, address, price, bedrooms, bathrooms, property_type, borough, images, is_active, latitude, longitude, listing_type, description, raw_data)')
        .in('folder_id', folderIds)
        .order('created_at', { ascending: false })
    : { data: [] }
  const { data: unfoldered } = await svc.from('saved_properties')
    .select('id, created_at, listing_id, folder_id, user_id, listings(id, address, price, bedrooms, bathrooms, property_type, borough, images, is_active, latitude, longitude, listing_type, description, raw_data)')
    .eq('user_id', user.id)
    .is('folder_id', null)
    .order('created_at', { ascending: false })

  const { data: pendingInvites } = folderIds.length > 0
    ? await svc.from('saved_property_folder_invites')
        .select('id, folder_id, email, expires_at')
        .in('folder_id', folderIds)
        .is('used_at', null)
        .gte('expires_at', new Date().toISOString())
    : { data: [] }

  const enrichedFolders = (folders || []).map((f: any) => ({
    ...f,
    isMine: f.user_id === user.id,
    members: (memberRows || [])
      .filter((m: any) => m.folder_id === f.id)
      .map((m: any) => ({
        user_id: m.user_id,
        email: usersById.get(m.user_id)?.email || null,
        name: usersById.get(m.user_id)?.name || null,
        is_you: m.user_id === user.id,
      })),
    pendingInvites: (pendingInvites || []).filter((i: any) => i.folder_id === f.id),
    properties: (foldered || []).filter((p: any) => p.folder_id === f.id),
    previousVisitedAt: previousVisits.get(f.id) || null,
  }))

  return (
    <main className="min-h-screen bg-[#F5EBE0]">
      <nav className="bg-[#1B2E4B] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light text-white no-underline" style={{ fontFamily: 'Georgia,serif' }}>
          nest<span style={{ color: '#D3755A' }} className="italic">london</span>
        </Link>
        <NavAuthButton variant="dark" />
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#D3755A' }}>My properties</p>
          <h1 className="text-3xl font-light text-[#1B2E4B]" style={{ fontFamily: 'Georgia,serif' }}>Saved properties</h1>
        </div>
        <SavedFoldersClient
          folders={enrichedFolders}
          allProperties={[...(foldered || []), ...(unfoldered || [])]}
          currentUserId={user.id}
        />
      </div>
    </main>
  )
}
