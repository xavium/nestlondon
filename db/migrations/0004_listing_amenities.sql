-- 0004_listing_amenities.sql
-- Caches nearby amenities (POIs from OpenStreetMap via Overpass API) per listing.
--
-- Each row = one POI near a listing. Categories: 'cafe', 'supermarket', 'restaurant',
-- 'park', 'gym', 'gp'. UI shows top 3 per category by distance.
--
-- Cache strategy: on-demand backfill. When a listing page is viewed, if no rows exist
-- (or rows are older than 30 days), the API route fires an Overpass refresh.
--
-- distance_meters is great-circle distance from listing to POI in metres.
-- fetched_at lets us age out stale rows.

CREATE TABLE IF NOT EXISTS listing_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('cafe', 'supermarket', 'restaurant', 'park', 'gym', 'gp')),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance_meters INTEGER NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_amenities_listing_category
  ON listing_amenities(listing_id, category, distance_meters);

CREATE INDEX IF NOT EXISTS idx_listing_amenities_fetched_at
  ON listing_amenities(listing_id, fetched_at DESC);

COMMENT ON TABLE listing_amenities IS 'Cached nearby POIs from OSM/Overpass per listing. Refreshed on-demand with 30-day staleness.';
