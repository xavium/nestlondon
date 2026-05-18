-- 0005_listing_dedupe.sql
-- Cross-source duplicate detection infrastructure.
--
-- When two listings are identified as the same property (via lib/listingFingerprint.ts
-- scoring + admin confirmation), we:
--   1. Pick one as canonical.
--   2. Set canonical_listing_id on the others to point at it.
--   3. Move source_urls into listing_sources so the canonical record has all of them.
--   4. Deactivate the non-canonical rows (is_active = false) but DO NOT delete them
--      — keep for audit and possible unmerge.
--   5. Log the action in listing_merge_log.
--
-- The UI hides listings where canonical_listing_id IS NOT NULL (they're merged away).

-- 1. canonical_listing_id: NULL means "this row is canonical". Otherwise points at the canonical row.
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS canonical_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_canonical ON listings(canonical_listing_id) 
  WHERE canonical_listing_id IS NOT NULL;

-- 2. listing_sources: tracks every (source, source_url) tuple for a canonical listing.
--    A canonical listing keeps its OWN source/source_url on the listings row, but
--    also has rows here for each merged-in duplicate's source.
CREATE TABLE IF NOT EXISTS listing_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A given source+url should only appear once per listing
  UNIQUE (listing_id, source, source_url)
);
CREATE INDEX IF NOT EXISTS idx_listing_sources_listing ON listing_sources(listing_id);

-- 3. listing_merge_log: audit trail. Every merge / unmerge action.
CREATE TABLE IF NOT EXISTS listing_merge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('merge', 'unmerge', 'reject')),
  canonical_listing_id UUID,         -- the surviving row (or what it would have been)
  merged_listing_id UUID,            -- the row being merged into canonical (or unmerged)
  score NUMERIC,                     -- pairScore at decision time
  performed_by UUID,                 -- auth.users.id; can be null for system actions
  notes TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listing_merge_log_canonical ON listing_merge_log(canonical_listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_merge_log_performed_at ON listing_merge_log(performed_at DESC);

COMMENT ON COLUMN listings.canonical_listing_id IS 
  'When set, this listing is a merged duplicate. Public queries should exclude rows where this is non-null.';
COMMENT ON TABLE listing_sources IS 
  'All source URLs for a canonical listing, including those from merged-in duplicates.';
COMMENT ON TABLE listing_merge_log IS 
  'Audit trail of merge/unmerge/reject decisions. Use to unmerge mistakes.';
