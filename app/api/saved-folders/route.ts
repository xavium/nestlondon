import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthed() {
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
  return { supabase, user }
}

/**
 * GET /api/saved-folders
 * Returns folders the user has access to, each with:
 *   - members (user_id + email)
 *   - propertyCount
 *   - pendingInvitesCount
 *   - isMine (creator)
 */
export async function GET() {
  const { supabase, user } = await getAuthed()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { createClient } = await import('@supabase/supabase-js')
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Folders the user has access to (RLS handles filtering)
  const { data: folders } = await supabase
    .from('saved_property_folders')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (!folders) return NextResponse.json({ folders: [] })

  const folderIds = folders.map((f: any) => f.id)
  if (folderIds.length === 0) return NextResponse.json({ folders: [] })

  // Members for these folders (use service role to also resolve emails)
  const { data: memberRows } = await svc
    .from('saved_property_folder_members')
    .select('folder_id, user_id, joined_via')
    .in('folder_id', folderIds)

  const allUserIds = Array.from(new Set((memberRows || []).map((m: any) => m.user_id)))
  const { data: usersData } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const usersById = new Map<string, { email?: string }>(
    (usersData as any).users.map((u: any) => [u.id, u])
  )

  // Property counts per folder
  const { data: countsRows } = await svc
    .from('saved_properties')
    .select('folder_id')
    .in('folder_id', folderIds)
  const countsMap = new Map<string, number>()
  ;(countsRows || []).forEach((r: any) => {
    countsMap.set(r.folder_id, (countsMap.get(r.folder_id) || 0) + 1)
  })

  // Pending invite counts per folder
  const { data: inviteRows } = await svc
    .from('saved_property_folder_invites')
    .select('folder_id')
    .in('folder_id', folderIds)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
  const inviteCountsMap = new Map<string, number>()
  ;(inviteRows || []).forEach((r: any) => {
    inviteCountsMap.set(r.folder_id, (inviteCountsMap.get(r.folder_id) || 0) + 1)
  })

  // Sample property images per folder for visual summary
  const { data: sampleRows } = await svc
    .from('saved_properties')
    .select('folder_id, listing_id, listings(images)')
    .in('folder_id', folderIds)
    .order('created_at', { ascending: false })
  const sampleImagesByFolder = new Map<string, string[]>()
  ;(sampleRows || []).forEach((r: any) => {
    const existing = sampleImagesByFolder.get(r.folder_id) || []
    if (existing.length >= 4) return
    try {
      const imgs = typeof r.listings?.images === 'string' ? JSON.parse(r.listings.images) : r.listings?.images
      const first = Array.isArray(imgs) ? imgs.find((u: string) => u?.startsWith('http')) : null
      if (first) {
        existing.push(first)
        sampleImagesByFolder.set(r.folder_id, existing)
      }
    } catch {}
  })

  const enriched = folders.map((f: any) => {
    const members = (memberRows || [])
      .filter((m: any) => m.folder_id === f.id)
      .map((m: any) => ({
        user_id: m.user_id,
        email: usersById.get(m.user_id)?.email || null,
        is_you: m.user_id === user.id,
        joined_via: m.joined_via,
      }))
    return {
      ...f,
      isMine: f.user_id === user.id,
      members,
      propertyCount: countsMap.get(f.id) || 0,
      pendingInvitesCount: inviteCountsMap.get(f.id) || 0,
      sampleImages: sampleImagesByFolder.get(f.id) || [],
    }
  })

  return NextResponse.json({ folders: enriched })
}
