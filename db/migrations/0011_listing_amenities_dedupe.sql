-- 0011_listing_amenities_dedupe.sql
--
-- Fix duplicate rows in listing_amenities and prevent them in future.
--
-- Background: Overpass returns each POI multiple times (once per OSM element
-- type: node, way, relation), all tagged with the same name and near-identical
-- coords. The amenities helper used to push each one into the DB without
-- deduping, so listings showed "Caffe Fratelli" 3 times in the What's nearby
-- panel. Code is now fixed (lib/amenities.ts dedupes on
-- category|name|roundedLat|roundedLng before insert), but existing rows need
-- cleanup, and we want a constraint to prevent regressions.
--
-- Run statements one at a time in the Supabase SQL editor.

-- Step 1: delete duplicates, keeping the row with the smaller UUID.
-- Round to 4 decimal places (~11m) to tolerate the small coord differences
-- between OSM node/way/relation versions of the same place.
DELETE FROM listing_amenities a
USING listing_amenities b
WHERE a.listing_id = b.listing_id
  AND a.category = b.category
  AND lower(a.name) = lower(b.name)
  AND round(a.latitude::numeric, 4) = round(b.latitude::numeric, 4)
  AND round(a.longitude::numeric, 4) = round(b.longitude::numeric, 4)
  AND a.id > b.id;

-- Step 2: enforce uniqueness going forward. Future inserts will fail loudly
-- if they violate this, which is better than silent duplication.
CREATE UNIQUE INDEX listing_amenities_unique_per_listing
ON listing_amenities (
  listing_id,
  category,
  lower(name),
  round(latitude::numeric, 4),
  round(longitude::numeric, 4)
);
