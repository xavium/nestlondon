-- 0010_listings_contact_phone.sql
-- Adds an optional contact_phone column to listings, used for the "Show phone number"
-- button on agent-direct listings. Scraped listings don't populate this (their phone is
-- behind the source-site's own reveal); only listings where an agent has explicitly
-- entered a phone in the dashboard will surface it on the listing page.
-- Nullable: agents can opt in, no backfill needed, existing rows stay valid.

alter table public.listings
  add column if not exists contact_phone text;
