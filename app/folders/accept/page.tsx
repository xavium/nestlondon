import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { acceptFolderInvite } from '@/lib/savedFolders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AcceptFolderInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6">
        <h1 className="text-xl font-semibold text-[#1C2B3A] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Missing invite token
        </h1>
        <p className="text-sm text-stone-600 mb-4">
          This invite link is malformed. Ask the sender to send you a new one.
        </p>
        <Link href="/" className="text-sm text-[#D3755A] hover:underline">← Back to home</Link>
      </div>
    )
  }

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

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/folders/accept?token=${token}`)}`)
  }

  const result = await acceptFolderInvite(supabase, user, token)

  if ('error' in result) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6">
        <h1 className="text-xl font-semibold text-[#1C2B3A] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          Couldn't accept invite
        </h1>
        <p className="text-sm text-stone-600 mb-4">{result.error}</p>
        <Link href="/saved" className="text-sm text-[#D3755A] hover:underline">Go to saved properties →</Link>
      </div>
    )
  }

  redirect('/saved')
}
