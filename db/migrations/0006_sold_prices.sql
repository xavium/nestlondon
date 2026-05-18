-- 0006_sold_prices.sql
-- HM Land Registry Price Paid Data, filtered to London postcodes only.
-- Updated monthly via scraper/ingest_land_registry.py.
--
-- Source: https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
-- Licence: Open Government Licence v3.0
--
-- Why no bedrooms/sqft: Land Registry doesn't capture these. We get price +
-- postcode + property type + new-build flag + tenure only. The comparables
-- algorithm uses postcode district + property type as the primary match key
-- (e.g. "flats in SW7 sold in the last 12 months").
--
-- Property type values: D = Detached, S = Semi-detached, T = Terraced,
-- F = Flat/Maisonette, O = Other.

CREATE TABLE IF NOT EXISTS sold_prices (
  -- Land Registry's unique transaction ID. Idempotent re-imports key off this.
  transaction_id TEXT PRIMARY KEY,
  price NUMERIC NOT NULL,
  date_of_transfer DATE NOT NULL,
  postcode TEXT NOT NULL,
  -- Postcode district extracted up-front for fast filtering (e.g. 'SW7')
  postcode_district TEXT NOT NULL,
  property_type CHAR(1) NOT NULL CHECK (property_type IN ('D', 'S', 'T', 'F', 'O')),
  -- Y/N flag for newly-built properties (different price dynamics; usually excluded from comparables)
  new_build BOOLEAN NOT NULL DEFAULT FALSE,
  -- F = Freehold, L = Leasehold
  tenure CHAR(1) NOT NULL CHECK (tenure IN ('F', 'L')),
  paon TEXT,                  -- Primary Addressable Object Name (house number/name)
  saon TEXT,                  -- Secondary Addressable Object Name (flat number)
  street TEXT,
  -- ppd_category: A = standard transaction, B = additional (repossessions, buy-to-let, etc.)
  -- We may want to filter to A only for "typical" comparables.
  ppd_category CHAR(1) DEFAULT 'A' CHECK (ppd_category IN ('A', 'B')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query path: by postcode district + property type + date range
CREATE INDEX IF NOT EXISTS idx_sold_prices_district_type_date 
  ON sold_prices(postcode_district, property_type, date_of_transfer DESC);

-- Secondary: lookup by full postcode (for tightest-radius queries)
CREATE INDEX IF NOT EXISTS idx_sold_prices_postcode ON sold_prices(postcode);

COMMENT ON TABLE sold_prices IS 
  'HM Land Registry Price Paid Data, filtered to London postcodes. Updated monthly.';
