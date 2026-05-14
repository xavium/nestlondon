/**
 * Price-change tracking helper. Records buy-side listing price changes into
 * the price_history table. Rent listings are ignored (rents rarely change).
 *
 * Callers: any path that writes to listings.price.
 * - scraper refresh (scrape_update.py — Python-side, can't use this; that file
 *   speaks directly to Supabase. Same logic is duplicated there.)
 * - app/api/listings/edit/[id]/route.ts (direct listing edit)
 * - app/api/feed/blm/route.ts (BLM feed — but that's rent only, so this is a no-op there)
 *
 * Design:
 * - Idempotent: if the most-recent price_history row already matches the new
 *   price, no insert. So repeated saves with the same price don't pollute history.
 * - Failure-tolerant: errors are logged but never re-thrown, so a price_history
 *   write failure doesn't break the underlying listing update.
 * - Buy-only: rent listings are skipped at the helper level so callers can't
 *   accidentally record rent changes.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

interface RecordOptions {
  /** When true, skip the buy-only guard. Used for the baseline insert on listing
   *  creation, where the calling code already knows the listing is buy-side. */
  skipTypeCheck?: boolean
}

/**
 * Record a price change for a listing. Compares against the latest
 * price_history row; only inserts if the price has actually changed (or if
 * there's no history yet for this listing).
 *
 * @param supabase - service-role Supabase client (RLS bypassed)
 * @param listingId - the listing being updated
 * @param newPrice - the new price (in GBP, as stored in listings.price)
 * @param opts.skipTypeCheck - bypass the buy-only check; caller already verified
 */
export async function recordPriceChange(
  supabase: SupabaseClient,
  listingId: string,
  newPrice: number | null | undefined,
  opts: RecordOptions = {}
): Promise<void> {
  // Guard: only meaningful when newPrice is a positive number.
  if (newPrice == null || !Number.isFinite(newPrice) || newPrice <= 0) return

  try {
    // Buy-only guard, unless caller has already confirmed.
    if (!opts.skipTypeCheck) {
      const { data: listing, error: lookupErr } = await supabase
        .from('listings')
        .select('listing_type')
        .eq('id', listingId)
        .maybeSingle()
      if (lookupErr) {
        console.error('[priceHistory] listing lookup error:', lookupErr.message)
        return
      }
      if (!listing || listing.listing_type !== 'buy') return
    }

    // Idempotency: fetch the latest history row for this listing.
    // If price already matches, do nothing.
    const { data: latest } = await supabase
      .from('price_history')
      .select('price')
      .eq('listing_id', listingId)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest && Number(latest.price) === Number(newPrice)) return

    const { error: insertErr } = await supabase
      .from('price_history')
      .insert({ listing_id: listingId, price: newPrice })

    if (insertErr) {
      console.error('[priceHistory] insert error:', insertErr.message)
    }
  } catch (e: any) {
    // Failure-tolerant: log and return. Never throw.
    console.error('[priceHistory] unexpected error:', e?.message || e)
  }
}

/**
 * Fetch the price history for a listing, newest first.
 * Used by the listing page UI to render the Price history section.
 */
export async function getPriceHistory(
  supabase: SupabaseClient,
  listingId: string
): Promise<Array<{ price: number; changed_at: string }>> {
  const { data, error } = await supabase
    .from('price_history')
    .select('price, changed_at')
    .eq('listing_id', listingId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[priceHistory] fetch error:', error.message)
    return []
  }
  return (data || []).map(r => ({ price: Number(r.price), changed_at: r.changed_at }))
}
