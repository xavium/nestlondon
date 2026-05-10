import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const svc = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'You must be signed in to submit an offer' }, { status: 401 })

    const body = await req.json()
    const {
      listing_id, offer_type,
      offerer_name, offerer_email, offerer_phone,
      offer_amount, deposit_amount, move_in_date, term_length_months, num_tenants,
      funding_source, mortgage_in_principle, chain_position, timescale, conditions,
      has_pets, pet_details, employment_status, job_title, guarantor_available,
      notes,
      // Lettings extras
      tenants, combined_salary, furnished_preference, special_requirements, guarantor_details,
      // Sales extras
      home_phone, rental_contract_notice, anticipated_exchange_date, anticipated_completion_date,
      special_terms, solicitor, mortgage_details, gifting, chain, remortgage,
      consent_to_share, funding_scenarios,
    } = body

    if (!listing_id || !offer_type || !offerer_name?.trim() || !offerer_phone?.trim() || !offer_amount) {
      return NextResponse.json({ error: 'Missing required fields (listing, name, phone, offer amount)' }, { status: 400 })
    }
    if (offer_type !== 'rent' && offer_type !== 'buy') {
      return NextResponse.json({ error: 'Invalid offer type' }, { status: 400 })
    }

    const sb = svc()

    const { data: listing } = await sb
      .from('listings')
      .select('id, address, price, listing_type, agent_id, raw_data')
      .eq('id', listing_id)
      .maybeSingle()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    // Renters' Rights Act: rent offers cannot exceed advertised price.
    if (offer_type === 'rent' && listing.price != null && Number(offer_amount) > Number(listing.price)) {
      return NextResponse.json({
        error: `Rental offers cannot exceed the listed price of £${Number(listing.price).toLocaleString()}/mo (Renters' Rights Act).`,
      }, { status: 400 })
    }

    const { data: offer, error: insertErr } = await sb.from('offers').insert({
      listing_id, offer_type,
      offerer_user_id: user.id,
      offerer_name: offerer_name.trim(),
      offerer_email: (offerer_email || user.email || '').trim().toLowerCase(),
      offerer_phone: offerer_phone.trim(),
      offer_amount: Number(offer_amount),
      deposit_amount: deposit_amount ? Number(deposit_amount) : null,
      move_in_date: move_in_date || null,
      term_length_months: term_length_months ? Number(term_length_months) : null,
      num_tenants: num_tenants ? Number(num_tenants) : null,
      funding_source: funding_source || null,
      mortgage_in_principle: typeof mortgage_in_principle === 'boolean' ? mortgage_in_principle : null,
      chain_position: chain_position || null,
      timescale: timescale || null,
      conditions: conditions?.trim() || null,
      has_pets: typeof has_pets === 'boolean' ? has_pets : null,
      pet_details: pet_details?.trim() || null,
      employment_status: employment_status || null,
      job_title: job_title?.trim() || null,
      guarantor_available: typeof guarantor_available === 'boolean' ? guarantor_available : null,
      notes: notes?.trim() || null,
      status: 'new',
      // Lettings extras
      tenants: tenants || null,
      combined_salary: combined_salary ? Number(combined_salary) : null,
      furnished_preference: furnished_preference || null,
      special_requirements: special_requirements?.trim() || null,
      guarantor_details: guarantor_details || null,
      // Sales extras
      home_phone: home_phone?.trim() || null,
      rental_contract_notice: rental_contract_notice?.trim() || null,
      anticipated_exchange_date: anticipated_exchange_date || null,
      anticipated_completion_date: anticipated_completion_date || null,
      special_terms: special_terms?.trim() || null,
      solicitor: solicitor || null,
      mortgage_details: mortgage_details || null,
      gifting: gifting || null,
      chain: chain || null,
      remortgage: remortgage || null,
      consent_to_share: typeof consent_to_share === 'boolean' ? consent_to_share : null,
      funding_scenarios: funding_scenarios || null,
    }).select('id').single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // Resolve recipient email
    let recipientEmail: string | null = null
    if (listing.agent_id) {
      const { data: agentUser } = await sb.auth.admin.getUserById(listing.agent_id)
      recipientEmail = agentUser?.user?.email || null
    }
    if (!recipientEmail) {
      recipientEmail = listing.raw_data?.contact?.email || null
    }

    // Send notification
    let email_sent = false
    if (recipientEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const origin = req.nextUrl.origin
        const portalUrl = listing.agent_id
          ? origin + '/dashboard?tab=offers'
          : origin + '/dashboard/owner?tab=offers'
        const typeLabel = offer_type === 'buy' ? 'offer' : 'rental offer'
        const amountLabel = offer_type === 'buy'
          ? '£' + Number(offer_amount).toLocaleString()
          : '£' + Number(offer_amount).toLocaleString() + '/mo'

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: recipientEmail,
          subject: 'New ' + typeLabel + ' received for ' + listing.address,
          html: '<div style=\"font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1B2E4B;\">' +
            '<h1 style=\"font-family: Georgia, serif; font-weight: 300; font-size: 26px; margin-bottom: 16px;\">You\'ve received a new ' + typeLabel + '</h1>' +
            '<p style=\"color: #3D3A38; line-height: 1.6;\">' + offerer_name.trim() + ' has submitted an offer of <strong>' + amountLabel + '</strong> for <strong>' + listing.address + '</strong>.</p>' +
            '<p style=\"text-align: center; margin: 32px 0;\">' +
              '<a href=\"' + portalUrl + '\" style=\"display: inline-block; background: #D3755A; color: white; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 500;\">Review in portal</a>' +
            '</p>' +
            '<p style=\"color: #9B928E; font-size: 12px;\">Review full offer details, accept, reject, or counter via your NestLondon portal.</p>' +
          '</div>',
        })
        email_sent = true
      } catch {
        // silent
      }
    }

    return NextResponse.json({ id: offer.id, email_sent })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to submit offer' }, { status: 500 })
  }
}
