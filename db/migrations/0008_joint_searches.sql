-- 0008_joint_searches.sql
-- Joint searches: two or more users collaborate on a property search.
--
-- Constraints:
--   - A user belongs to AT MOST ONE joint search at a time (enforced by UNIQUE on user_id)
--   - All members are equal — anyone can invite, leave, or remove others
--   - Invites can be email-based (sent to specific address) or link-based (anyone with token)
--   - Properties saved to a joint search are shared; comments are threaded with reactions
--
-- Migration order (apply each statement separately in Supabase SQL Editor):
--   1. CREATE TABLE joint_searches
--   2. CREATE TABLE joint_search_members
--   3. CREATE TABLE joint_search_invites
--   4. CREATE TABLE joint_saved_properties
--   5. CREATE TABLE joint_comments
--   6. CREATE TABLE joint_comment_reactions
--   7. Indexes
--   8. RLS enablement
--   9. RLS policies

-- 1. The joint search itself
CREATE TABLE IF NOT EXISTS joint_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Membership: user × joint search.
--    The UNIQUE on user_id enforces "at most one joint search per user".
CREATE TABLE IF NOT EXISTS joint_search_members (
  joint_search_id UUID NOT NULL REFERENCES joint_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_via TEXT NOT NULL CHECK (joined_via IN ('creator', 'email_invite', 'share_link')),
  PRIMARY KEY (joint_search_id, user_id),
  UNIQUE (user_id)  -- one joint search per user, no exceptions
);

-- 3. Invites: email-based AND shareable-link tokens (both live in this table).
--    - email IS NOT NULL → email invite, targeted at one address
--    - email IS NULL    → share link, anyone with the token can use it
--    Both use the same `token` column for the magic value, same expires_at, etc.
CREATE TABLE IF NOT EXISTS joint_search_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_search_id UUID NOT NULL REFERENCES joint_searches(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id)
);

-- 4. Saved properties for the joint search (parallels saved_properties for individuals)
CREATE TABLE IF NOT EXISTS joint_saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_search_id UUID NOT NULL REFERENCES joint_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id),
  saved_by UUID NOT NULL REFERENCES auth.users(id),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (joint_search_id, listing_id)
);

-- 5. Threaded comments. parent_comment_id = NULL → top-level comment on a property.
--    parent_comment_id NOT NULL → reply to another comment.
CREATE TABLE IF NOT EXISTS joint_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_search_id UUID NOT NULL REFERENCES joint_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id),
  parent_comment_id UUID REFERENCES joint_comments(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- 6. Reactions. Multiple emojis per user per comment? No — one emoji per user per comment.
--    To change reaction, delete + insert. Matches Slack/Discord behaviour.
CREATE TABLE IF NOT EXISTS joint_comment_reactions (
  comment_id UUID NOT NULL REFERENCES joint_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT NOT NULL CHECK (length(emoji) > 0 AND length(emoji) <= 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_joint_members_user ON joint_search_members(user_id);
CREATE INDEX IF NOT EXISTS idx_joint_invites_email ON joint_search_invites(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_joint_invites_token ON joint_search_invites(token);
CREATE INDEX IF NOT EXISTS idx_joint_invites_joint ON joint_search_invites(joint_search_id);
CREATE INDEX IF NOT EXISTS idx_joint_saved_joint ON joint_saved_properties(joint_search_id);
CREATE INDEX IF NOT EXISTS idx_joint_comments_listing ON joint_comments(joint_search_id, listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_joint_comments_parent ON joint_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- 8. Enable RLS (deny by default)
ALTER TABLE joint_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_search_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_search_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_comment_reactions ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies will be applied as separate statements after the tables exist.
--    See db/migrations/0008_joint_searches_policies.sql.
