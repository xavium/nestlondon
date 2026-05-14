-- 0001_lease_details.sql
-- Adds lease-detail columns to listings for service charge, ground rent, and
-- lease years remaining. All three nullable — data is patchy and extracted
-- per-listing rather than required at scrape time.
--
-- Service charge / ground rent stored as annual GBP (integer). The UI renders
-- "£X / year". Lease years remaining stored as integer (years).

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS lease_years_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS service_charge_annual INTEGER,
  ADD COLUMN IF NOT EXISTS ground_rent_annual INTEGER;

-- No indexes yet. Add later if filter usage warrants it.
