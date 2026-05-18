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

import { createFolderInvite } from '@/lib/savedFolders'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: folderId } = await params
  const { supabase, user } = await getAuthed()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null) || {}
  const email = body.email && typeof body.email === 'string' && body.email.includes('@')
    ? body.email.trim().toLowerCase()
    : null

  try {
    const invite = await createFolderInvite(supabase, user, folderId, email)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const inviteUrl = `${siteUrl}/folders/accept?token=${encodeURIComponent(invite.token)}`

    // Send the email if applicable
    if (email && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NestLondon <hello@nestlondon.co.uk>',
            to: email,
            subject: `You'\''ve been invited to a shared property folder on NestLondon`,
            text: `${user.email || 'A NestLondon user'} has invited you to a shared property folder.\n\nJoin here: ${inviteUrl}\n\nThis invite expires in 14 days.`,
          }),
        })
      } catch (e) {
        console.error('[folder-invite] email send failed:', e)
      }
    }

    return NextResponse.json({ invite, inviteUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
