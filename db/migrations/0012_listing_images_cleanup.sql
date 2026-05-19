-- 0012_listing_images_cleanup.sql
--
-- One-off cleanup of malformed image URLs in `listings.images`.
--
-- Two known scraper bugs have been leaking junk into image URLs:
--
--   1. `&quot;)` appended when scraper parsed URLs from CSS
--      background-image: url("...") attributes without unescaping HTML
--      entities or trimming trailing parens.
--   2. `/crop/<ratio>/` segment from Rightmove's image CDN (e.g.
--      `/crop/10:9-16:9/`). This crop endpoint 404s for arbitrary aspect
--      ratios — only the un-cropped path serves.
--
-- The code-side cleanup in lib/listingImages.ts handles both at render
-- time. This migration backfills existing rows so data is clean too.
--
-- Run statements one at a time in the Supabase SQL editor.

-- Step 1: strip the literal `&quot;)` sequence. Surgical: matches only the
-- specific known pattern (HTML-encoded quote + close paren) so we don't
-- accidentally damage valid JSON quoting.
UPDATE listings
SET images = regexp_replace(images::text, '&quot;\)', '', 'g')::jsonb
WHERE images::text LIKE '%&quot;)%';

-- Step 2: strip the `/crop/<ratio>/` segment from Rightmove URLs. The
-- segment is always between `/crop/` and the next `/`. After this update,
-- URLs look like `https://media.rightmove.co.uk/property-photo/...` —
-- which serves cleanly.
UPDATE listings
SET images = regexp_replace(images::text, '/crop/[^/]+/', '/', 'g')::jsonb
WHERE images::text LIKE '%/crop/%';
