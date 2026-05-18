-- 0007_listing_owner_user_id.sql
-- Adds a listings.owner_user_id field to track WHO CREATED a direct listing,
-- separate from agent_id (which only tracks ASSIGNED agents on agent-listed properties).
-- This is needed for RLS — private sellers and landlords couldn't authenticate ownership
-- via agent_id since it's null for them.
--
-- Backfills existing agent listings from agent_id. Private/landlord listings created
-- before this migration will have NULL owner_user_id and must be cleaned up separately
-- (or simply remain inaccessible to their original creators — a small dataset issue).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Backfill: for agent-created listings, the agent IS the owner
UPDATE listings SET owner_user_id = agent_id WHERE owner_user_id IS NULL AND agent_id IS NOT NULL;

-- Index for RLS lookups (will be queried on every offers read by listing owner)
CREATE INDEX IF NOT EXISTS idx_listings_owner_user_id ON listings(owner_user_id) WHERE owner_user_id IS NOT NULL;

COMMENT ON COLUMN listings.owner_user_id IS 'User who created the listing (any lister type: agent/private/landlord). RLS uses this to authenticate ownership.';
