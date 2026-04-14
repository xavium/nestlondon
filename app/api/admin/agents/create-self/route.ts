import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { user_id, name, email } = await req.json()
    if (!user_id || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if agent record already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) return NextResponse.json({ success: true, exists: true })

    const api_key = crypto.randomBytes(32).toString('hex')
    await supabase.from('agents').insert({
      id: user_id,
      name: name || email,
      email,
      api_key,
      is_active: true,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
