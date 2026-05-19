# Database migrations

Track schema changes here. Migrations are documentation — they are NOT auto-applied. Run them manually in the Supabase SQL editor when shipping a change.

## Naming
- `NNNN_short_description.sql` — zero-padded sequence, snake_case description.
- One migration per logical change.

## Applying
1. Open the migration file, copy its SQL.
2. Paste into the Supabase SQL Editor (Project → SQL Editor → New query).
3. Run. Idempotent migrations (`IF NOT EXISTS` etc.) are safe to re-run.

## History
| # | File | Description |
|---|------|-------------|
| 0001 | `0001_lease_details.sql` | Adds lease_years_remaining, service_charge_annual, ground_rent_annual to listings |
| 0002 | `0002_price_history.sql` | Adds price_history table for tracking buy-side price changes |
| 0003 | `0003_blog_posts.sql` | Adds blog_posts table for the /blog section, with RLS for public-read-published and admin-all |
| 0004 | `0004_listing_amenities.sql` | Adds listing_amenities table for cached nearby POI data from Overpass/OSM |
| 0005 | `0005_listing_dedupe.sql` | Adds canonical_listing_id, listing_sources, listing_merge_log for cross-source dedupe |
| 0006 | `0006_sold_prices.sql` | Adds sold_prices table for HM Land Registry Price Paid Data, London postcodes only |
| 0007 | `0007_listing_owner_user_id.sql` | Adds owner_user_id to listings; backfills from agent_id; tightens RLS on offers/listings/viewing_requests/listing_events |
| 0008 | `0008_joint_searches.sql` | Joint searches: tables for collaborative property search (members, invites, saved properties, threaded comments, reactions) |
| 0009 | `0009_folder_sharing.sql` | Pivot from joint-search to per-folder sharing: extends saved_property_folders, adds folder_members/invites/comments/reactions, drops joint_* tables |
| 0010 | `0010_listings_contact_phone.sql` | Adds optional contact_phone column to listings for agent-direct "Show phone number" reveal on listing pages |

## 0011_listing_amenities_dedupe.sql

Cleans up duplicate rows in `listing_amenities` (Overpass returns the same POI
as node + way + relation, all of which used to get inserted separately) and
adds a unique index on `(listing_id, category, lower(name), round(lat, 4),
round(lng, 4))` to prevent re-occurrence.

Run statements one at a time. Step 1 deletes duplicates; Step 2 adds the index.

## 0012_listing_images_cleanup.sql

Backfills two known scraper bugs in `listings.images`:
1. `&quot;)` artefacts from CSS `background-image: url(...)` parsing
2. `/crop/<ratio>/` segments from Rightmove's image CDN (which 404)

The code-side fix in `lib/listingImages.ts` already handles both at render
time; this migration cleans the historical data so future reads don't need
to re-parse them.

Run statements one at a time.
