-- 0002_price_history.sql
-- Tracks price changes for buy listings only. One row per change.
--
-- Design notes:
-- - Buy-side only: rent prices rarely move and aren't a notable buyer signal.
--   The helper that writes rows is buy-only; no DB-level constraint enforces this
--   (would need a join on listings, which complicates indexes).
-- - changed_at uses DEFAULT NOW() so writers don't have to supply it.
-- - ON DELETE CASCADE: if a listing is hard-deleted, its history goes with it.

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup pattern: "give me the history for listing X, newest first" — covered by this index.
CREATE INDEX IF NOT EXISTS idx_price_history_listing_changed
  ON price_history(listing_id, changed_at DESC);

-- Update the migration log
COMMENT ON TABLE price_history IS 'Price change events for buy-side listings. Rows are append-only, written by lib/priceHistory.recordPriceChange.';
