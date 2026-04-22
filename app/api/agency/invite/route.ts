import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { resolveAgency } from '@/lib/agency'

async function getUser() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await auth.auth.getUser()
  return user
}
const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await resolveAgency(user.id)
  if (!ctx || !ctx.isAdmin) return NextResponse.json({ error: 'Only admins can invite' }, { status: 403 })

  const { name, email, role, is_admin, color } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
  }

  const { data: existing } = await svc()
    .from('agency_agents')
    .select('id, invitation_status')
    .eq('agency_id', ctx.agencyId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (existing && existing.invitation_status === 'pending') {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 })
  }

  const token = randomBytes(24).toString('hex')

  const { data, error } = await svc()
    .from('agency_agents')
    .insert({
      agency_id: ctx.agencyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'agent',
      color: color || null,
      is_admin: !!is_admin,
      invitation_token: token,
      invitation_status: 'pending',
      invited_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = req.nextUrl.origin
  const invite_url = `${origin}/auth/invite/${token}`

  // Send invitation email (best effort — if it fails, the copyable link still works)
  let email_sent = false
  let email_error: string | null = null
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const inviterName = user.user_metadata?.agency_name || user.user_metadata?.name || 'Your colleague'
      const adminLine = is_admin ? ' as an <strong>admin</strong>' : ''
      const { error: sendErr } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email.trim().toLowerCase(),
        subject: `You've been invited to join ${inviterName} on NestLondon`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1B2E4B;">
            <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 28px; margin-bottom: 16px;">You're invited to ${inviterName}</h1>
            <p style="color: #3D3A38; line-height: 1.6;">Hi ${name.trim()},</p>
            <p style="color: #3D3A38; line-height: 1.6;">${inviterName} has invited you to join their agency on NestLondon${adminLine}. Click below to set up your account:</p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${invite_url}" style="display: inline-block; background: #D3755A; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 500;">Accept invitation</a>
            </p>
            <p style="color: #9B928E; font-size: 13px; line-height: 1.6;">Or paste this link into your browser:<br><span style="word-break: break-all;">${invite_url}</span></p>
            <hr style="border: none; border-top: 1px solid #E8E2DA; margin: 32px 0;">
            <p style="color: #9B928E; font-size: 12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        `,
      })
      if (sendErr) email_error = sendErr.message
      else email_sent = true
    } catch (e: any) {
      email_error = e?.message || 'Email send failed'
    }
  }

  return NextResponse.json({ agent: data, invite_url, email_sent, email_error })
}
