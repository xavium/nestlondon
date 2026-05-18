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

import { leaveFolder } from '@/lib/savedFolders'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await params
  const { supabase, user } = await getAuthed()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const result = await leaveFolder(supabase, user, folderId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true, deleted: result.deleted })
}
