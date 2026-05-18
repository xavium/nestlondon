-- 0009_folder_sharing.sql
-- Pivot from "joint search" (one collaborative search per user) to folder-level sharing.
-- A user can be a member of multiple shared folders, each scoped to a different group.
--
-- Schema changes:
--   1. Add saved_property_folders.is_shared (bool) and archived_at
--   2. Create saved_property_folder_members
--   3. Create saved_property_folder_invites
--   4. Create folder_comments (threaded, scoped to folder+listing)
--   5. Create folder_comment_reactions
--   6. Drop all joint_* tables (NO migration of data — joint search infrastructure 
--      was built this same session and no real users have data in it)
--
-- saved_properties keeps its schema. RLS is extended so that folder members 
-- can read each other's rows when both rows belong to the same shared folder.

-- 1. Extend saved_property_folders
ALTER TABLE saved_property_folders ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE saved_property_folders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Folder membership
CREATE TABLE IF NOT EXISTS saved_property_folder_members (
  folder_id UUID NOT NULL REFERENCES saved_property_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_via TEXT NOT NULL CHECK (joined_via IN ('creator', 'email_invite', 'share_link')),
  PRIMARY KEY (folder_id, user_id)
);

-- 3. Folder invites (email + share link in one table)
CREATE TABLE IF NOT EXISTS saved_property_folder_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES saved_property_folders(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id)
);

-- 4. Threaded comments scoped to folder + listing
CREATE TABLE IF NOT EXISTS folder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES saved_property_folders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id),
  parent_comment_id UUID REFERENCES folder_comments(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- 5. Reactions
CREATE TABLE IF NOT EXISTS folder_comment_reactions (
  comment_id UUID NOT NULL REFERENCES folder_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT NOT NULL CHECK (length(emoji) > 0 AND length(emoji) <= 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_folder_members_user ON saved_property_folder_members(user_id);
CREATE INDEX IF NOT EXISTS idx_folder_invites_email ON saved_property_folder_invites(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folder_invites_token ON saved_property_folder_invites(token);
CREATE INDEX IF NOT EXISTS idx_folder_invites_folder ON saved_property_folder_invites(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_comments_listing ON folder_comments(folder_id, listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_folder_comments_parent ON folder_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- 7. Enable RLS
ALTER TABLE saved_property_folder_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_property_folder_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_comment_reactions ENABLE ROW LEVEL SECURITY;

-- 8. Drop the joint_* tables (built earlier this session, no real data)
DROP TABLE IF EXISTS joint_comment_reactions CASCADE;
DROP TABLE IF EXISTS joint_comments CASCADE;
DROP TABLE IF EXISTS joint_saved_properties CASCADE;
DROP TABLE IF EXISTS joint_search_invites CASCADE;
DROP TABLE IF EXISTS joint_search_members CASCADE;
DROP TABLE IF EXISTS joint_searches CASCADE;
DROP FUNCTION IF EXISTS is_joint_search_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS uid_check() CASCADE;
